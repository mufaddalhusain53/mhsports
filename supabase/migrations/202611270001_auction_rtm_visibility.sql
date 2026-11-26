alter table public.auction_tournaments
  add column if not exists rtm_enabled boolean not null default true;
