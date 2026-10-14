QuadClash 100 dynamic points-table sync

Deploy index.ts as the code for the existing quadclash-points-sync Edge Function.
It discovers standings from embedded CricHeroes HTML and does not use a hardcoded team-ID allowlist or expected team count.

It keeps the current FC_SYNC_SECRET / x-sync-secret authentication and the existing shared tables:
- fc_points_standings
- fc_points_sync_runs

Tournament key: quad-clash-100-s1

It refuses to upsert if no standings are parsed. Test after deployment; CricHeroes may change its page payload.
