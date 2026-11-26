alter table public.auction_tournaments
  add column if not exists projector_player_fields text[] not null
    default array['skill', 'batting_style', 'bowling_style', 'previous_team']::text[];

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'auction_tournaments_projector_player_fields_check'
      and conrelid = 'public.auction_tournaments'::regclass
  ) then
    alter table public.auction_tournaments
      add constraint auction_tournaments_projector_player_fields_check
      check (
        projector_player_fields <@ array['skill', 'batting_style', 'bowling_style', 'previous_team']::text[]
        and array_position(projector_player_fields, null) is null
      );
  end if;
end $$;
