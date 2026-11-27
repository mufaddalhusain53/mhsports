alter table public.auction_tournaments
  add column if not exists projector_theme text not null default 'classic'
    check (projector_theme in ('classic', 'spotlight'));
