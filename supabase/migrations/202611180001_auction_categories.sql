create table if not exists public.auction_categories (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.auction_tournaments(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  base_price numeric(12, 2) not null check (base_price >= 0),
  max_players integer not null check (max_players > 0),
  min_players integer not null default 0 check (min_players >= 0 and min_players <= max_players),
  created_at timestamptz not null default now(),
  unique (tournament_id, id)
);

create unique index if not exists auction_categories_tournament_name_idx
  on public.auction_categories (tournament_id, lower(name));

insert into public.auction_categories (tournament_id, name, base_price, max_players, min_players)
select distinct on (p.tournament_id, lower(p.category))
  p.tournament_id, p.category, t.base_price, t.max_squad_size, 0
from public.auction_players p
join public.auction_tournaments t on t.id = p.tournament_id
order by p.tournament_id, lower(p.category), p.category;

alter table public.auction_players
  add column if not exists category_id uuid;

update public.auction_players p
set category_id = c.id
from public.auction_categories c
where c.tournament_id = p.tournament_id
  and lower(c.name) = lower(p.category)
  and p.category_id is null;

alter table public.auction_players
  alter column category_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'auction_players_tournament_category_fk'
  ) then
    alter table public.auction_players
      add constraint auction_players_tournament_category_fk
      foreign key (tournament_id, category_id)
      references public.auction_categories(tournament_id, id);
  end if;
end $$;

create index if not exists auction_players_category_team_status_idx
  on public.auction_players (tournament_id, category_id, sold_team_id, status);

create or replace function public.auction_sync_category_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.name is distinct from old.name then
    update public.auction_players
    set category = new.name
    where tournament_id = new.tournament_id and category_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists auction_sync_category_name on public.auction_categories;
create trigger auction_sync_category_name
after update of name on public.auction_categories
for each row execute function public.auction_sync_category_name();

alter table public.auction_categories enable row level security;
revoke all on public.auction_categories from anon, authenticated;
grant select on public.auction_categories to anon, authenticated;
grant all privileges on public.auction_categories to service_role;

drop policy if exists "Public can view auction categories" on public.auction_categories;
create policy "Public can view auction categories" on public.auction_categories
  for select to anon, authenticated using (true);

create or replace function public.auction_team_category_reserve(
  p_tournament_id uuid,
  p_team_id uuid,
  p_current_category_id uuid
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tournament public.auction_tournaments%rowtype;
  v_team_count integer;
  v_category_slots integer;
  v_category_reserve numeric;
  v_extra_slots integer;
  v_slot_price numeric;
  v_slot_capacity integer;
  v_take integer;
begin
  select * into v_tournament
  from public.auction_tournaments
  where id = p_tournament_id;
  if not found then
    raise exception 'Auction tournament not found.';
  end if;

  select count(*) into v_team_count
  from public.auction_players
  where tournament_id = p_tournament_id
    and sold_team_id = p_team_id
    and status = 'sold';

  select
    coalesce(sum(greatest(c.min_players - coalesce(s.sold_count, 0)
      - case when c.id = p_current_category_id then 1 else 0 end, 0)), 0),
    coalesce(sum(greatest(c.min_players - coalesce(s.sold_count, 0)
      - case when c.id = p_current_category_id then 1 else 0 end, 0) * c.base_price), 0)
  into v_category_slots, v_category_reserve
  from public.auction_categories c
  left join (
    select category_id, count(*) as sold_count
    from public.auction_players
    where tournament_id = p_tournament_id
      and sold_team_id = p_team_id
      and status = 'sold'
    group by category_id
  ) s on s.category_id = c.id
  where c.tournament_id = p_tournament_id;

  v_extra_slots := greatest(v_tournament.min_squad_size - v_team_count - 1 - v_category_slots, 0);
  for v_slot_price, v_slot_capacity in
    select c.base_price,
      greatest(c.max_players - coalesce(s.sold_count, 0)
        - case when c.id = p_current_category_id then 1 else 0 end
        - greatest(c.min_players - coalesce(s.sold_count, 0)
          - case when c.id = p_current_category_id then 1 else 0 end, 0), 0)
    from public.auction_categories c
    left join (
      select category_id, count(*) as sold_count
      from public.auction_players
      where tournament_id = p_tournament_id
        and sold_team_id = p_team_id
        and status = 'sold'
      group by category_id
    ) s on s.category_id = c.id
    where c.tournament_id = p_tournament_id
    order by c.base_price
  loop
    exit when v_extra_slots = 0;
    v_take := least(v_extra_slots, v_slot_capacity);
    v_category_reserve := v_category_reserve + (v_take * v_slot_price);
    v_extra_slots := v_extra_slots - v_take;
  end loop;
  if v_extra_slots > 0 then
    raise exception 'Category maximums do not leave enough roster places to meet the tournament minimum squad size.';
  end if;
  return v_category_reserve;
end;
$$;

revoke all on function public.auction_team_category_reserve(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.auction_team_category_reserve(uuid, uuid, uuid) to service_role;

create or replace function public.auction_record_bid(p_slug text, p_team_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tournament public.auction_tournaments%rowtype;
  v_team public.auction_teams%rowtype;
  v_player public.auction_players%rowtype;
  v_category public.auction_categories%rowtype;
  v_team_count integer;
  v_category_count integer;
  v_minimum_bid numeric;
  v_increment numeric;
  v_reserve numeric;
  v_maximum_bid numeric;
begin
  select * into v_tournament from public.auction_tournaments where slug = p_slug for update;
  if not found or v_tournament.status != 'live' or v_tournament.current_player_id is null then
    raise exception 'There is no active player in a live auction.';
  end if;

  select * into v_player from public.auction_players
  where id = v_tournament.current_player_id and tournament_id = v_tournament.id for update;
  if not found or v_player.status != 'available' then
    raise exception 'The current player is no longer accepting bids.';
  end if;
  select * into v_category from public.auction_categories
  where id = v_player.category_id and tournament_id = v_tournament.id;
  if not found then
    raise exception 'The current player does not have a configured auction category.';
  end if;

  select * into v_team from public.auction_teams
  where id = p_team_id and tournament_id = v_tournament.id for update;
  if not found then raise exception 'Team does not belong to this tournament.'; end if;

  select count(*) into v_team_count
  from public.auction_players where sold_team_id = v_team.id and status = 'sold';
  if v_team_count >= v_tournament.max_squad_size then
    raise exception 'Team has reached its maximum squad size.';
  end if;
  select count(*) into v_category_count
  from public.auction_players
  where sold_team_id = v_team.id and category_id = v_category.id and status = 'sold';
  if v_category_count >= v_category.max_players then
    raise exception 'Team has reached the maximum player count for category %.', v_category.name;
  end if;

  v_reserve := public.auction_team_category_reserve(v_tournament.id, v_team.id, v_category.id);
  v_maximum_bid := v_team.points_remaining - v_reserve + (v_team.rtm_count * v_category.base_price);
  if v_tournament.current_bid is null then
    v_minimum_bid := v_category.base_price;
  else
    select (rule->>'increment')::numeric into v_increment
    from jsonb_array_elements(v_tournament.bid_increment_rules) as rule
    where (rule->>'from')::numeric <= v_tournament.current_bid
    order by (rule->>'from')::numeric desc
    limit 1;
    v_minimum_bid := v_tournament.current_bid + coalesce(v_increment, v_tournament.bid_increment);
  end if;
  if p_amount is null or p_amount < v_minimum_bid then raise exception 'Bid must be at least % points.', v_minimum_bid; end if;
  if round(p_amount, 2) != p_amount then raise exception 'Bids can have at most two decimal places.'; end if;
  if p_amount > v_maximum_bid then
    raise exception 'Maximum bid is % points; % points must be reserved for minimum squad and category requirements.',
      greatest(v_maximum_bid, 0), v_reserve;
  end if;

  update public.auction_tournaments
  set current_bid = p_amount, current_bid_team_id = p_team_id, updated_at = now()
  where id = v_tournament.id;
end;
$$;

create or replace function public.auction_finalize_player(p_slug text, p_result text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tournament public.auction_tournaments%rowtype;
  v_player public.auction_players%rowtype;
  v_category public.auction_categories%rowtype;
  v_team_count integer;
  v_category_count integer;
begin
  select * into v_tournament from public.auction_tournaments where slug = p_slug for update;
  if not found or v_tournament.status != 'live' or v_tournament.current_player_id is null then
    raise exception 'There is no active player in a live auction.';
  end if;
  if p_result not in ('sold', 'unsold') then raise exception 'Auction result must be sold or unsold.'; end if;

  select * into v_player from public.auction_players
  where id = v_tournament.current_player_id and tournament_id = v_tournament.id for update;
  if not found or v_player.status != 'available' then
    raise exception 'The current player already has an auction result.';
  end if;

  if p_result = 'sold' then
    if v_tournament.current_bid is null or v_tournament.current_bid_team_id is null then
      raise exception 'A team must place a bid before a player can be sold.';
    end if;
    select * into v_category from public.auction_categories
    where id = v_player.category_id and tournament_id = v_tournament.id;
    if not found then raise exception 'The player does not have a configured auction category.'; end if;
    if v_tournament.current_bid < v_category.base_price then
      raise exception 'The final bid is below the category base price of % points.', v_category.base_price;
    end if;

    select count(*) into v_team_count
    from public.auction_players
    where sold_team_id = v_tournament.current_bid_team_id and status = 'sold';
    if v_team_count >= v_tournament.max_squad_size then raise exception 'Team has reached its maximum squad size.'; end if;

    select count(*) into v_category_count
    from public.auction_players
    where sold_team_id = v_tournament.current_bid_team_id
      and category_id = v_category.id and status = 'sold';
    if v_category_count >= v_category.max_players then
      raise exception 'Team has reached the maximum player count for category %.', v_category.name;
    end if;

    update public.auction_teams
    set points_remaining = points_remaining - v_tournament.current_bid
    where id = v_tournament.current_bid_team_id and tournament_id = v_tournament.id;
    update public.auction_players
    set status = 'sold', sold_team_id = v_tournament.current_bid_team_id,
        sold_price = v_tournament.current_bid
    where id = v_player.id;
  else
    update public.auction_players
    set status = 'unsold', sold_team_id = null, sold_price = null
    where id = v_player.id;
  end if;

  update public.auction_tournaments
  set current_bid = null, current_bid_team_id = null, updated_at = now()
  where id = v_tournament.id;
end;
$$;

revoke all on function public.auction_record_bid(text, uuid, numeric) from public, anon, authenticated;
revoke all on function public.auction_finalize_player(text, text) from public, anon, authenticated;
grant execute on function public.auction_record_bid(text, uuid, numeric) to service_role;
grant execute on function public.auction_finalize_player(text, text) to service_role;
