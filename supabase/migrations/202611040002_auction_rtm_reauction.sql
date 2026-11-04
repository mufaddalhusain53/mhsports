alter table public.auction_players
  add column if not exists rtm_team_id uuid references public.auction_teams(id) on delete set null;

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
    if v_player.sold_team_id is not null then
      update public.auction_teams
        set points_remaining = points_remaining + v_player.sold_price
        where id = v_player.sold_team_id;
    end if;
    if v_player.rtm_team_id is not null then
      update public.auction_teams
        set rtm_count = rtm_count + 1
        where id = v_player.rtm_team_id and tournament_id = v_tournament.id;
    end if;
  elsif v_player.status not in ('available', 'unsold') then
    raise exception 'Player is not available for auction.';
  end if;
  update public.auction_players
    set status = 'available', sold_team_id = null, sold_price = null, rtm_team_id = null
    where id = v_player.id;
  update public.auction_tournaments
    set current_player_id = p_player_id, current_bid = null,
        current_bid_team_id = null, updated_at = now()
    where id = v_tournament.id;
end;
$$;

revoke all on function public.auction_select_player(text, uuid) from public, anon, authenticated;
grant execute on function public.auction_select_player(text, uuid) to service_role;
