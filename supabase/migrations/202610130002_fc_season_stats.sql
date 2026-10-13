-- Raw CSV imports for Friendship Cup historical season leaderboards.
-- Each season/category has one current file; re-uploading replaces that slot.
create table if not exists public.fc_season_stats_raw (
  season smallint not null check (season between 1 and 7),
  category text not null check (category in ('batting','bowling','fielding','mvp')),
  file_name text not null,
  csv_content text not null,
  updated_at timestamptz not null default now(),
  primary key (season, category)
);

alter table public.fc_season_stats_raw enable row level security;
drop policy if exists "Public can read FC season stats" on public.fc_season_stats_raw;
create policy "Public can read FC season stats"
  on public.fc_season_stats_raw for select to anon, authenticated using (true);
grant select on public.fc_season_stats_raw to anon, authenticated;
revoke insert, update, delete on public.fc_season_stats_raw from anon, authenticated;
