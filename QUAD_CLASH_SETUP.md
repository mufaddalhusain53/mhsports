# Quad Clash 100 flow setup

## Supabase
1. Run `supabase/migrations/202610140001_qc100_season_stats.sql` in the Supabase SQL Editor.
2. The API uses the existing server-side `supabaseAdmin` service-role client and admin authentication.
3. Open Admin Dashboard → Quad Clash 100 to upload a CSV for Season 1 or Season 2 and choose Batting, Bowling, Fielding or MVP.

## Pages
- `/tournaments/quadclash100` — hub
- `/tournaments/quadclash100/stats` — CSV-backed stats
- `/tournaments/quadclash100/points-table` — link to official CricHeroes points table
- `/tournaments/quadclash100/teams` — Season 1 squads from the supplied PDF; Season 2 selector is disabled until data is provided
- `/tournaments/quadclash100/season-2` — revised dates provided by user
- `/tournaments/quadclash100/registration` — Coming Soon
- `/tournaments/quadclash100/sponsors` — tournament and franchise sponsors transcribed from supplied images
- `/tournaments/quadclash100/hall-of-fame` — Strikers and Multiplize Highlanders

## Notes
- CricHeroes is linked as the source of truth for live Season 1 standings; no undocumented endpoint or fabricated standings are used.
- Team roster names, roles, playing specialties and auction prices were transcribed from the user-provided `QuadClash 100 - All Team Wise.pdf`. Phone numbers were intentionally not copied into the public team page.
- Season 2 dates are shown exactly as provided: 20th, 21st and 22nd March 2026. Since these dates are in the past relative to the current date, update them if a new revision is issued.
- All new pages use responsive grids and wrap long text; stats tables are contained in their own overflow wrapper on small screens.
