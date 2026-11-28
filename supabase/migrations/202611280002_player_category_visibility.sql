alter table public.auction_tournaments
  add column if not exists show_player_category boolean not null default true;
