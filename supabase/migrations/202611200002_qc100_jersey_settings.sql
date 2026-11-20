create table if not exists public.qc100_jersey_settings (
  id integer primary key check (id = 1),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.qc100_jersey_settings (id, enabled)
values (1, false)
on conflict (id) do nothing;

alter table public.qc100_jersey_settings enable row level security;
revoke all on public.qc100_jersey_settings from anon, authenticated;
grant all privileges on public.qc100_jersey_settings to service_role;