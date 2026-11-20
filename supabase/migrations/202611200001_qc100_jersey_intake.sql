create table if not exists public.qc100_jersey_requests (
  id uuid primary key,
  player_name text not null check (char_length(player_name) between 1 and 100),
  jersey_name text not null check (char_length(jersey_name) between 1 and 100),
  phone_number text not null check (phone_number ~ '^[0-9]{10}$'),
  team text not null check (team in ('Ezzi United', 'Multiplize Highlanders', 'Mavericks', 'Strikers')),
  jersey_size text not null check (jersey_size in ('32','34','36','38','40','42','44','46','48','50')),
  jersey_option text not null check (jersey_option in ('1 Half', '1 Full', '1 Full, 1 Half', '2 Full')),
  amount integer not null check (
    (jersey_option = '1 Half' and amount = 0) or
    (jersey_option = '1 Full' and amount = 150) or
    (jersey_option = '1 Full, 1 Half' and amount = 650) or
    (jersey_option = '2 Full' and amount = 800)
  ),
  payment_status text not null check (
    (amount = 0 and payment_status = 'free') or
    (amount > 0 and payment_status in ('pending', 'paid'))
  ),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.qc100_jersey_requests enable row level security;
revoke all on public.qc100_jersey_requests from anon, authenticated;
grant all privileges on public.qc100_jersey_requests to service_role;
