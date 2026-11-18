alter table public.auction_tournaments
  add column if not exists auction_mode text not null default 'trial';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'auction_tournaments_auction_mode_check'
  ) then
    alter table public.auction_tournaments
      add constraint auction_tournaments_auction_mode_check
      check (auction_mode in ('trial', 'live'));
  end if;
end $$;

create or replace function public.auction_reset(p_slug text, p_expected_mode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tournament public.auction_tournaments%rowtype;
begin
  select * into v_tournament
  from public.auction_tournaments
  where slug = p_slug
  for update;

  if not found then
    raise exception 'Auction tournament not found.';
  end if;
  if v_tournament.auction_mode is distinct from p_expected_mode then
    raise exception 'Auction mode changed. Refresh and try again.';
  end if;

  update public.auction_teams t
  set points_remaining = v_tournament.points_per_team,
      rtm_count = t.rtm_count + coalesce(rtm_used.count, 0)
  from (
    select rtm_team_id, count(*)::integer as count
    from public.auction_players
    where tournament_id = v_tournament.id
      and rtm_team_id is not null
    group by rtm_team_id
  ) rtm_used
  where t.tournament_id = v_tournament.id
    and t.id = rtm_used.rtm_team_id;

  update public.auction_teams
  set points_remaining = v_tournament.points_per_team
  where tournament_id = v_tournament.id
    and id not in (
      select rtm_team_id
      from public.auction_players
      where tournament_id = v_tournament.id
        and rtm_team_id is not null
    );

  update public.auction_players
  set status = 'available',
      sold_team_id = null,
      sold_price = null,
      rtm_team_id = null
  where tournament_id = v_tournament.id;

  update public.auction_tournaments
  set status = 'setup',
      current_player_id = null,
      current_bid = null,
      current_bid_team_id = null,
      updated_at = now()
  where id = v_tournament.id;
end;
$$;

revoke all on function public.auction_reset(text, text) from public, anon, authenticated;
grant execute on function public.auction_reset(text, text) to service_role;
