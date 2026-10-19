create table if not exists public.auction_tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'setup' check (status in ('setup', 'live', 'paused', 'completed')),
  points_per_team numeric(12, 2) not null default 1000 check (points_per_team >= 0),
  base_price numeric(12, 2) not null default 0 check (base_price >= 0),
  bid_increment numeric(12, 2) not null default 1 check (bid_increment > 0),
  min_squad_size integer not null default 0 check (min_squad_size >= 0),
  max_squad_size integer not null default 25 check (max_squad_size > 0),
  current_player_id uuid,
  current_bid numeric(12, 2),
  current_bid_team_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_squad_size <= max_squad_size)
);

create table if not exists public.auction_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.auction_tournaments(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_url text,
  points_remaining numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  unique (tournament_id, slug),
  unique (tournament_id, id)
);

create table if not exists public.auction_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.auction_tournaments(id) on delete cascade,
  player_number integer not null check (player_number > 0),
  full_name text not null check (char_length(full_name) between 1 and 160),
  category text not null check (char_length(category) between 1 and 80),
  role text,
  batting_style text,
  bowling_style text,
  previous_team text,
  photo_url text,
  status text not null default 'available' check (status in ('available', 'sold', 'unsold')),
  sold_team_id uuid references public.auction_teams(id) on delete set null,
  sold_price numeric(12, 2),
  created_at timestamptz not null default now(),
  unique (tournament_id, player_number),
  unique (tournament_id, id),
  check (
    (status = 'sold' and sold_team_id is not null and sold_price is not null)
    or (status != 'sold' and sold_team_id is null and sold_price is null)
  )
);

create table if not exists public.auction_sponsors (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.auction_tournaments(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  logo_url text,
  website_url text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'auction_tournaments_current_player_fk'
  ) then
    alter table public.auction_tournaments
      add constraint auction_tournaments_current_player_fk
      foreign key (id, current_player_id)
      references public.auction_players(tournament_id, id)
      deferrable initially deferred;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'auction_tournaments_current_bid_team_fk'
  ) then
    alter table public.auction_tournaments
      add constraint auction_tournaments_current_bid_team_fk
      foreign key (id, current_bid_team_id)
      references public.auction_teams(tournament_id, id)
      deferrable initially deferred;
  end if;
end $$;

create index if not exists auction_teams_tournament_idx
  on public.auction_teams (tournament_id, name);
create index if not exists auction_players_tournament_status_idx
  on public.auction_players (tournament_id, status, player_number);
create index if not exists auction_sponsors_tournament_order_idx
  on public.auction_sponsors (tournament_id, display_order, name);

alter table public.auction_tournaments enable row level security;
alter table public.auction_teams enable row level security;
alter table public.auction_players enable row level security;
alter table public.auction_sponsors enable row level security;

revoke all on public.auction_tournaments, public.auction_teams, public.auction_players, public.auction_sponsors from anon, authenticated;
grant select on public.auction_tournaments, public.auction_teams, public.auction_players, public.auction_sponsors to anon, authenticated;
grant all privileges on public.auction_tournaments, public.auction_teams, public.auction_players, public.auction_sponsors to service_role;

drop policy if exists "Public can view auction tournaments" on public.auction_tournaments;
create policy "Public can view auction tournaments" on public.auction_tournaments
  for select to anon, authenticated using (true);
drop policy if exists "Public can view auction teams" on public.auction_teams;
create policy "Public can view auction teams" on public.auction_teams
  for select to anon, authenticated using (true);
drop policy if exists "Public can view auction players" on public.auction_players;
create policy "Public can view auction players" on public.auction_players
  for select to anon, authenticated using (true);
drop policy if exists "Public can view auction sponsors" on public.auction_sponsors;
create policy "Public can view auction sponsors" on public.auction_sponsors
  for select to anon, authenticated using (true);

create or replace function public.auction_select_player(p_slug text, p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tournament public.auction_tournaments%rowtype;
  v_player public.auction_players%rowtype;
begin
  select * into v_tournament from public.auction_tournaments
    where slug = p_slug for update;
  if not found or v_tournament.status != 'live' then
    raise exception 'Auction must be live to call a player.';
  end if;
  if v_tournament.current_player_id is not null then
    raise exception 'Finish the current player before selecting another.';
  end if;
  select * into v_player from public.auction_players
    where id = p_player_id and tournament_id = v_tournament.id for update;
  if not found or v_player.status not in ('available', 'unsold') then
    raise exception 'Player is not available for auction.';
  end if;
  update public.auction_players
    set status = 'available', sold_team_id = null, sold_price = null
    where id = v_player.id;
  update public.auction_tournaments
    set current_player_id = p_player_id, current_bid = null,
        current_bid_team_id = null, updated_at = now()
    where id = v_tournament.id;
end;
$$;

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
  v_team_count integer;
begin
  select * into v_tournament from public.auction_tournaments
    where slug = p_slug for update;
  if not found or v_tournament.status != 'live' or v_tournament.current_player_id is null then
    raise exception 'There is no active player in a live auction.';
  end if;
  select * into v_team from public.auction_teams
    where id = p_team_id and tournament_id = v_tournament.id for update;
  if not found then
    raise exception 'Team does not belong to this tournament.';
  end if;
  select * into v_player from public.auction_players
    where id = v_tournament.current_player_id for update;
  select count(*) into v_team_count from public.auction_players
    where sold_team_id = v_team.id and status = 'sold';
  if v_team_count >= v_tournament.max_squad_size then
    raise exception 'Team has reached its maximum squad size.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Bid amount must be greater than zero.';
  end if;
  if v_tournament.current_bid is null then
    if p_amount != v_tournament.base_price then
      raise exception 'Opening bid must equal the configured base price.';
    end if;
  elsif p_amount != v_tournament.current_bid + v_tournament.bid_increment then
    raise exception 'Bid must increase by the configured increment.';
  end if;
  if p_amount > v_team.points_remaining then
    raise exception 'Team does not have enough points for this bid.';
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
  v_team_count integer;
begin
  select * into v_tournament from public.auction_tournaments
    where slug = p_slug for update;
  if not found or v_tournament.status != 'live' or v_tournament.current_player_id is null then
    raise exception 'There is no active player in a live auction.';
  end if;
  if p_result not in ('sold', 'unsold') then
    raise exception 'Auction result must be sold or unsold.';
  end if;
  select * into v_player from public.auction_players
    where id = v_tournament.current_player_id for update;
  if p_result = 'sold' then
    if v_tournament.current_bid is null or v_tournament.current_bid_team_id is null then
      raise exception 'A team must place a bid before a player can be sold.';
    end if;
    select count(*) into v_team_count from public.auction_players
      where sold_team_id = v_tournament.current_bid_team_id and status = 'sold';
    if v_team_count >= v_tournament.max_squad_size then
      raise exception 'Team has reached its maximum squad size.';
    end if;
    update public.auction_teams
      set points_remaining = points_remaining - v_tournament.current_bid
      where id = v_tournament.current_bid_team_id;
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
    set current_player_id = null, current_bid = null,
        current_bid_team_id = null, updated_at = now()
    where id = v_tournament.id;
end;
$$;

revoke all on function public.auction_select_player(text, uuid) from public, anon, authenticated;
revoke all on function public.auction_record_bid(text, uuid, numeric) from public, anon, authenticated;
revoke all on function public.auction_finalize_player(text, text) from public, anon, authenticated;
grant execute on function public.auction_select_player(text, uuid) to service_role;
grant execute on function public.auction_record_bid(text, uuid, numeric) to service_role;
grant execute on function public.auction_finalize_player(text, text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('auction-assets', 'auction-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view auction assets" on storage.objects;
create policy "Public can view auction assets" on storage.objects
  for select to anon, authenticated using (bucket_id = 'auction-assets');

do $$
declare
  t text;
begin
  foreach t in array array['auction_tournaments', 'auction_teams', 'auction_players', 'auction_sponsors']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
