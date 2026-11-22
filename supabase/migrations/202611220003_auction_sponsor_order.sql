create or replace function public.auction_reorder_sponsors(
  p_tournament_id uuid,
  p_sponsor_ids uuid[]
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform 1 from public.auction_tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'Auction tournament not found.';
  end if;

  perform 1 from public.auction_sponsors where tournament_id = p_tournament_id for update;

  select count(*) into v_count
  from public.auction_sponsors
  where tournament_id = p_tournament_id;

  if p_sponsor_ids is null
    or cardinality(p_sponsor_ids) <> v_count
    or (select count(distinct id) from unnest(p_sponsor_ids) as ids(id)) <> v_count
    or (select count(*) from public.auction_sponsors
        where tournament_id = p_tournament_id and id = any(p_sponsor_ids)) <> v_count then
    raise exception 'Sponsor list changed. Refresh and try again.';
  end if;

  update public.auction_sponsors as sponsor
  set display_order = ordered.position::integer - 1
  from unnest(p_sponsor_ids) with ordinality as ordered(id, position)
  where sponsor.tournament_id = p_tournament_id
    and sponsor.id = ordered.id
    and sponsor.display_order is distinct from ordered.position::integer - 1;
end;
$$;

revoke all on function public.auction_reorder_sponsors(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.auction_reorder_sponsors(uuid, uuid[]) to service_role;
