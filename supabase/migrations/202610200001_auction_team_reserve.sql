create or replace function public.auction_record_bid(p_slug text, p_team_id uuid, p_amount numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tournament public.auction_tournaments%rowtype;
  v_team public.auction_teams%rowtype;
  v_player public.auction_players%rowtype;
  v_team_count integer;
  v_minimum_bid numeric;
  v_increment numeric;
  v_reserve numeric;
  v_maximum_bid numeric;
begin
  select * into v_tournament from public.auction_tournaments where slug = p_slug for update;
  if not found or v_tournament.status != 'live' or v_tournament.current_player_id is null then raise exception 'There is no active player in a live auction.'; end if;
  select * into v_player from public.auction_players where id = v_tournament.current_player_id for update;
  if not found or v_player.status != 'available' then raise exception 'The current player is no longer accepting bids.'; end if;
  select * into v_team from public.auction_teams where id = p_team_id and tournament_id = v_tournament.id for update;
  if not found then raise exception 'Team does not belong to this tournament.'; end if;
  select count(*) into v_team_count from public.auction_players where sold_team_id = v_team.id and status = 'sold';
  if v_team_count >= v_tournament.max_squad_size then raise exception 'Team has reached its maximum squad size.'; end if;
  v_reserve := greatest(v_tournament.min_squad_size - v_team_count - 1, 0) * v_tournament.base_price;
  v_maximum_bid := v_team.points_remaining - v_reserve;
  if v_tournament.current_bid is null then v_minimum_bid := v_tournament.base_price;
  else
    select (rule->>'increment')::numeric into v_increment from jsonb_array_elements(v_tournament.bid_increment_rules) as rule where (rule->>'from')::numeric <= v_tournament.current_bid order by (rule->>'from')::numeric desc limit 1;
    v_minimum_bid := v_tournament.current_bid + coalesce(v_increment, v_tournament.bid_increment);
  end if;
  if p_amount is null or p_amount < v_minimum_bid then raise exception 'Bid must be at least % points.', v_minimum_bid; end if;
  if round(p_amount, 2) != p_amount then raise exception 'Bids can have at most two decimal places.'; end if;
  if p_amount > v_maximum_bid then raise exception 'Maximum bid is % points; % points must be reserved for the remaining minimum squad slots.', greatest(v_maximum_bid, 0), v_reserve; end if;
  update public.auction_tournaments set current_bid = p_amount, current_bid_team_id = p_team_id, updated_at = now() where id = v_tournament.id;
end;
$$;

revoke all on function public.auction_record_bid(text, uuid, numeric) from public, anon, authenticated;
grant execute on function public.auction_record_bid(text, uuid, numeric) to service_role;
