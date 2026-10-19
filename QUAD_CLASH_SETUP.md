# Quad Clash 100 flow setup

## Supabase
1. Run `supabase/migrations/202610140001_qc100_season_stats.sql` in the Supabase SQL Editor.
2. The API uses the existing server-side `supabaseAdmin` service-role client and admin authentication.
3. From `/admin`, open QuadClash 100 → Leaderboard Update to upload a CSV for Season 1 or Season 2 and choose Batting, Bowling, Fielding or MVP.
4. Run `supabase/migrations/202610190001_qc100_player_registration.sql` in the Supabase SQL Editor to create the registrations/settings tables and the public player-photo bucket. Registration is disabled by default. Duplicate registrations are blocked for the same ITS ID + mobile number combination. If the migration was already applied before the admin permission grants, 4 MB photo limit, composite duplicate-registration index, or auction availability field were added, run it again to apply them.
5. From `/admin`, open QuadClash 100 → Player Registration Management to enable or disable the form, view registered players, mark individual players inactive/unavailable for auction, and open their public photo links. The existing `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` server configuration is used; never expose the service key to the browser.

## Admin pages
- `/admin` — admin section navigation
- `/admin/friendship-cup/leaderboard` — points table refresh and season leaderboard uploads
- `/admin/quadclash100/leaderboard` — QuadClash 100 leaderboard CSV upload
- `/admin/quadclash100/player-registration` — registration switch and player list
- `/admin/mohalla/survey` — Mohalla Tournament survey management

## Pages
- `/tournaments/quadclash100` — hub
- `/tournaments/quadclash100/stats` — CSV-backed stats
- `/tournaments/quadclash100/points-table` — link to official CricHeroes points table
- `/tournaments/quadclash100/teams` — Season 1 squads from the supplied PDF; Season 2 selector is disabled until data is provided
- `/tournaments/quadclash100/season-2` — revised dates provided by user
- `/tournaments/quadclash100/registration` — tournament details and an admin-gated player registration form
- `/tournaments/quadclash100/sponsors` — tournament and franchise sponsors transcribed from supplied images
- `/tournaments/quadclash100/hall-of-fame` — Strikers and Multiplize Highlanders

## Notes
- CricHeroes is linked as the source of truth for live Season 1 standings; no undocumented endpoint or fabricated standings are used.
- Team roster names, roles, playing specialties and auction prices were transcribed from the user-provided `QuadClash 100 - All Team Wise.pdf`. Phone numbers were intentionally not copied into the public team page.
- Season 2 dates are shown exactly as provided: 20th, 21st and 22nd March 2026. Since these dates are in the past relative to the current date, update them if a new revision is issued.
- The player registration details currently show 20, 21 and 22 March 2027 as supplied for this form. Player photos are publicly accessible through share links; registration records themselves are only retrieved through the authenticated admin API.
- All new pages use responsive grids and wrap long text; stats tables are contained in their own overflow wrapper on small screens.
