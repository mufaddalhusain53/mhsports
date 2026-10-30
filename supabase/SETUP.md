# Friendship Cup S7 CricHeroes → Supabase sync

Tournament: `2206973`  
Public page: https://cricheroes.com/tournament/2206973/friendship-cup-s7/point-table

## 1. Apply the database migration

In Supabase Dashboard → SQL Editor, run the complete file:
`supabase/migrations/202610130001_fc7_points_sync.sql`

This creates:
- `fc_points_standings`: public-read cached standings
- `fc_points_sync_runs`: private sync run log

## 2. Configure Edge Function secrets

Generate a long random secret (at least 32 bytes). Set the same value as `FC_SYNC_SECRET` in both places below. Do not put it in client-side `NEXT_PUBLIC_*` variables.

Supabase Dashboard → Edge Functions → Secrets:
- `FC_SYNC_SECRET` = your generated secret
- `SUPABASE_URL` = your project URL (normally supplied by Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` = your service-role key (normally supplied by Supabase; never expose it in browser code)

## 3. Deploy the function

From the repository root with Supabase CLI linked to the correct project:

```bash
supabase functions deploy cricheroes-sync --no-verify-jwt
```

The function performs its own `x-sync-secret` check. The secret must be configured before testing.

## 4. Add Vercel environment variables

In Vercel → Project → Settings → Environment Variables, set:
- `NEXT_PUBLIC_SUPABASE_URL` = project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = publishable/anon key
- `FC_SYNC_SECRET` = the same generated secret used by the Edge Function

Redeploy the website after changing environment variables. The secret is server-side only; do not prefix it with `NEXT_PUBLIC_`.

## 5. Test manually

After migration, deploy, and environment variables are set, sign in to `/admin`, choose **Friendship Cup**, and click **Refresh Points Table**. Expected successful response: `ok: true`, `team_count: 8`. Verify all eight rows in `fc_points_standings`.

The points table is publicly readable and does not require a CricHeroes account. The sync parses the standings rows embedded in the public page and validates all eight expected teams before updating the cache. If fetching or parsing fails, it returns an error and leaves the cached standings unchanged. When CricHeroes rejects Supabase's Deno egress with HTTP 403, the authenticated Vercel refresh route retries the public fetch and passes the response to the function for the same validation and write. Deploy both the Vercel app and the Edge Function after this change. CricHeroes' embedded page data is undocumented and may change.

## 6. Schedule every five minutes

Do this only after a successful manual test. Supabase Dashboard → Integrations / Cron (label may vary) can schedule a SQL command. Store `FC_SYNC_SECRET` in Supabase Vault and use `pg_net` to call the function with `x-sync-secret`. Example SQL template (replace the Vault secret name if you choose a different one):

```sql
select cron.schedule(
  'friendship-cup-s7-points-sync',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := '<SUPABASE_URL>/functions/v1/cricheroes-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'fc_sync_secret' limit 1),
      'apikey', '<SUPABASE_PUBLISHABLE_OR_ANON_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Before running the schedule SQL, enable the `pg_cron`, `pg_net`, and Vault extensions if they are available in your Supabase project. Keep secrets out of source control. Check that only one job with this name exists to avoid duplicate schedules.

## Important hardening before public production

- The manual-refresh API route requires the site's admin session and keeps `FC_SYNC_SECRET` off the browser. The secret protects this site's sync function; it is not a CricHeroes credential.
- The scraper relies on CricHeroes' undocumented embedded payload. Keep response validation enabled and monitor failed runs.
- Run `npm run build` after installing dependencies. The ZIP intentionally excludes credentials and `.env` files.

## Friendship Cup season stats (Seasons 1–7)

1. Apply `migrations/202610130002_fc_season_stats.sql` to the same Supabase project used by this app.
2. Deploy the updated app. The public Friendship Cup Stats page reads uploaded CSV content through `/api/fc-season-stats`; it no longer loads bundled Excel/MVP files.
3. Sign in to `/admin`, choose **Friendship Cup**, and use **Season Stats CSV Upload**. Upload one CSV for each season/category (Batting, Bowling, Fielding, MVP). Uploading the same season/category again replaces the previous import.
4. Historical CSVs for Seasons 1–6 are included in the separate `fc-season-stats-csv-import-kit.zip`. Upload all 24 files through the admin UI. Season 7 can be uploaded when its CSV exports are available.
5. The table stores raw CSV text in Supabase Postgres, not Storage, so it does not consume Supabase Storage quota. Public users can read the stats; writes are restricted to the server-side admin API.

The Friendship Cup Stats page also displays the supplied Hall of Fame: Seasons 1–6 champions and runners-up, with Season 7 marked as in progress.
