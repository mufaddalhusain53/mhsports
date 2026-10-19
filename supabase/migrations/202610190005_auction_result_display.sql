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
  v_minimum_bid numeric;
begin
  select * into v_tournament from public.auction_tournaments
    where slug = p_slug for update;
  if not found or v_tournament.status != 'live' or v_tournament.current_player_id is null then
    raise exception 'There is no active player in a live auction.';
  end if;
  select * into v_player from public.auction_players
    where id = v_tournament.current_player_id for update;
  if not found or v_player.status != 'available' then
    raise exception 'The current player is no longer accepting bids.';
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
  if not found or v_player.status != 'available' then
    raise exception 'The current player already has an auction result.';
  end if;
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
    set current_bid = null, current_bid_team_id = null, updated_at = now()
    where id = v_tournament.id;
end;
$$;

revoke all on function public.auction_record_bid(text, uuid, numeric) from public, anon, authenticated;
revoke all on function public.auction_finalize_player(text, text) from public, anon, authenticated;
grant execute on function public.auction_record_bid(text, uuid, numeric) to service_role;
grant execute on function public.auction_finalize_player(text, text) to service_role;
