do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'auction_categories'
  ) then
    alter publication supabase_realtime add table public.auction_categories;
  end if;
end $$;
