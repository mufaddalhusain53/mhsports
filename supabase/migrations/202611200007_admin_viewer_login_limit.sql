create table if not exists public.admin_viewer_login_limit (
  id integer primary key check (id = 1),
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0)
);

alter table public.admin_viewer_login_limit enable row level security;
revoke all on public.admin_viewer_login_limit from public, anon, authenticated;

create or replace function public.consume_admin_viewer_login_attempt()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_count integer;
begin
  insert into public.admin_viewer_login_limit as limits (id, window_started_at, attempts)
  values (1, now(), 1)
  on conflict (id) do update
  set window_started_at = case
        when limits.window_started_at <= now() - interval '15 minutes' then now()
        else limits.window_started_at
      end,
      attempts = case
        when limits.window_started_at <= now() - interval '15 minutes' then 1
        else least(limits.attempts + 1, 6)
      end
  returning attempts into attempt_count;

  return attempt_count <= 5;
end;
$$;

revoke all on function public.consume_admin_viewer_login_attempt() from public, anon, authenticated;
grant execute on function public.consume_admin_viewer_login_attempt() to service_role;
