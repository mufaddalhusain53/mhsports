alter table public.auction_tournaments
  add column if not exists tournament_logo_url text,
  add column if not exists organizer_logo_urls text[] not null default '{}';

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
  select * into v_player from public.auction_players
    where id = p_player_id and tournament_id = v_tournament.id for update;
  if not found then
    raise exception 'Player does not belong to this tournament.';
  end if;
  if v_player.status = 'sold' then
    update public.auction_teams
      set points_remaining = points_remaining + v_player.sold_price
      where id = v_player.sold_team_id;
  elsif v_player.status not in ('available', 'unsold') then
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
  v_team_count integer;
  v_minimum_bid numeric;
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
  select count(*) into v_team_count from public.auction_players
    where sold_team_id = v_team.id and status = 'sold';
  if v_team_count >= v_tournament.max_squad_size then
    raise exception 'Team has reached its maximum squad size.';
  end if;
  if v_tournament.current_bid is null then
    v_minimum_bid := v_tournament.base_price;
  else
    v_minimum_bid := v_tournament.current_bid + v_tournament.bid_increment;
  end if;
  if p_amount is null or p_amount < v_minimum_bid then
    raise exception 'Bid must be at least % points.', v_minimum_bid;
  end if;
  if round(p_amount, 2) != p_amount then
    raise exception 'Bids can have at most two decimal places.';
  end if;
  if p_amount > v_team.points_remaining then
    raise exception 'Team does not have enough points for this bid.';
  end if;
  update public.auction_tournaments
    set current_bid = p_amount, current_bid_team_id = p_team_id, updated_at = now()
    where id = v_tournament.id;
end;
$$;

create or replace function public.auction_skip_player(p_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tournament public.auction_tournaments%rowtype;
begin
  select * into v_tournament from public.auction_tournaments
    where slug = p_slug for update;
  if not found or v_tournament.status != 'live' or v_tournament.current_player_id is null then
    raise exception 'There is no active player to skip.';
  end if;
  update public.auction_tournaments
    set current_player_id = null, current_bid = null,
        current_bid_team_id = null, updated_at = now()
    where id = v_tournament.id;
end;
$$;

revoke all on function public.auction_skip_player(text) from public, anon, authenticated;
grant execute on function public.auction_skip_player(text) to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'auction_tournaments'
  ) then
    alter publication supabase_realtime add table public.auction_tournaments;
  end if;
end $$;
