alter table public.auction_tournaments
  add column if not exists scheduled_date date;
