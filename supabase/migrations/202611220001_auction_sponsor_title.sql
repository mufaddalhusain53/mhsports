alter table public.auction_sponsors
  add column if not exists sponsor_title text;
