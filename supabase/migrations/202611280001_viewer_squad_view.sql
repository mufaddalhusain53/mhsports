alter table public.auction_tournaments
  add column if not exists viewer_squad_view text not null default 'cards'
    check (viewer_squad_view in ('cards', 'field'));
