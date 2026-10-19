alter table public.auction_tournaments
  add column if not exists background_url text;
