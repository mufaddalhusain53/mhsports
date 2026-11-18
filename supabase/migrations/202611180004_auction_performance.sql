create index if not exists auction_players_sold_team_idx
  on public.auction_players (sold_team_id)
  where status = 'sold';
