# Quad Clash 100 flow setup

## Supabase
1. Run `supabase/migrations/202610140001_qc100_season_stats.sql` in the Supabase SQL Editor.
2. The API uses the existing server-side `supabaseAdmin` service-role client and admin authentication.
3. From `/admin`, open QuadClash 100 → Leaderboard Update to upload a CSV for Season 1 or Season 2 and choose Batting, Bowling, Fielding or MVP.
4. Run `supabase/migrations/202610190001_qc100_player_registration.sql` in the Supabase SQL Editor to create the registrations/settings tables and the public player-photo bucket. Registration is disabled by default. Duplicate registrations are blocked for the same ITS ID + mobile number combination. If the migration was already applied before the admin permission grants, 4 MB photo limit, composite duplicate-registration index, or auction availability field were added, run it again to apply them.
5. From `/admin`, open QuadClash 100 → Player Registration Management to enable or disable the form, view registered players, mark individual players inactive/unavailable for auction, and open their public photo links. The existing `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` server configuration is used; never expose the service key to the browser.

## View-only admin

1. Apply `supabase/migrations/202611200007_admin_viewer_login_limit.sql` in the same Supabase project. This migration is required before view-only login works.
2. Set `ADMIN_VIEWER_PIN` as a server-only environment variable locally and in Vercel. It must differ from the existing `ADMIN_PIN`. Do not commit PINs or add them to `NEXT_PUBLIC_*` variables. Deploy the app after configuring the environment.
3. Enter either PIN on the admin login page. The view-only PIN opens the restricted dashboard; the existing super admin PIN keeps full access.

The view-only admin can view and export QuadClash player registrations and jersey requests. They cannot change form status, player status, payments, records, points, statistics or auctions. Anyone who can view personal information can also copy or save it.

Inter Mohalla public and admin pages are temporarily disabled. Set `INTER_MOHALLA_ENABLED` in `lib/tournament-features.ts` to `true` to restore them and their navigation entries; existing survey data is unchanged.

When the view-only PIN is configured, login attempts that do not match the super admin PIN are limited to five per shared 15-minute window, including successful view-only logins. The limit is shared by all users and resets after the window. If the limiter is unavailable, view-only login is disabled until the database issue is resolved. The correct super admin PIN remains usable during a lockout; this does not add a rate limit to the existing super admin login. A four-digit PIN is weak even with throttling: use a longer unique PIN for both roles and share it securely. Changing a PIN does not revoke existing sessions; rotate `ADMIN_SESSION_SECRET` to invalidate all sessions immediately.

## Admin pages
- `/admin` — admin section navigation
- `/admin/friendship-cup/leaderboard` — points table refresh and season leaderboard uploads
- `/admin/quadclash100/leaderboard` — QuadClash 100 leaderboard CSV upload
- `/admin/quadclash100/player-registration` — registration switch and player list
- `/admin/mohalla/survey` — Mohalla Tournament survey management (temporarily disabled)

## Pages
- `/tournaments/quadclash100` — hub
- `/tournaments/quadclash100/stats` — CSV-backed stats
- `/tournaments/quadclash100/points-table` — final Season 1 standings and Season 2 announcement, with a link to CricHeroes
- `/tournaments/quadclash100/teams` — Season 1 squads from the supplied PDF; Season 2 selector is disabled until data is provided
- `/tournaments/quadclash100/season-2` — revised dates provided by user
- `/tournaments/quadclash100/registration` — tournament details and an admin-gated player registration form
- `/tournaments/quadclash100/sponsors` — tournament and franchise sponsors transcribed from supplied images
- `/tournaments/quadclash100/hall-of-fame` — Strikers and Multiplize Highlanders

## Notes
- Season 1 final standings are stored in the site, with CricHeroes linked as their source; Season 2 standings are not yet available.
- Team roster names, roles, playing specialties and auction prices were transcribed from the user-provided `QuadClash 100 - All Team Wise.pdf`. Phone numbers were intentionally not copied into the public team page.
- Season 2 dates are 20th, 21st and 22nd March 2027.
- The player registration details currently show 20, 21 and 22 March 2027 as supplied for this form. Player photos are publicly accessible through share links; registration records themselves are only retrieved through the authenticated admin API.
- All new pages use responsive grids and wrap long text; stats tables are contained in their own overflow wrapper on small screens.
