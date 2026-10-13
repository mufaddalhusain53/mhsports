-- Friendship Cup Season 7 points-table cache.
create table if not exists public.fc_points_sync_runs (
  id bigint generated always as identity primary key,
  tournament_key text not null default 'friendship-cup-s7',
  status text not null check (status in ('success','failed')),
  team_count integer not null default 0,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.fc_points_standings (
  tournament_key text not null default 'friendship-cup-s7',
  team_id text not null,
  team_name text not null,
  position integer,
  matches_played integer not null default 0,
  won integer not null default 0,
  lost integer not null default 0,
  drawn integer not null default 0,
  tied integer not null default 0,
  no_result integer not null default 0,
  points numeric not null default 0,
  net_run_rate numeric not null default 0,
  runs_for text,
  runs_against text,
  last_five text,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (tournament_key, team_id)
);

alter table public.fc_points_standings enable row level security;
alter table public.fc_points_sync_runs enable row level security;

drop policy if exists "Public can read FC standings" on public.fc_points_standings;
create policy "Public can read FC standings"
  on public.fc_points_standings for select to anon, authenticated using (true);

-- Sync run logs are intentionally not public-readable.
revoke all on public.fc_points_sync_runs from anon, authenticated;
grant select on public.fc_points_standings to anon, authenticated;
