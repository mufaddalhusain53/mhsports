# Live auction setup

## Supabase

Run these migrations in order in the Supabase SQL Editor:

1. `supabase/migrations/202610190002_live_auctions.sql`
2. `supabase/migrations/202610190003_auction_background.sql`
3. `supabase/migrations/202610190004_auction_console_projector.sql`
4. `supabase/migrations/202610190005_auction_result_display.sql`

Together, they create the auction tables, read-only public policies, atomic bid/sale functions, the public image bucket, Realtime publication entries, tournament background and presentation-logo settings, live-console operations for skipping and re-auctioning players, and persistent current-player sold/unsold results.

The app uses the existing Supabase URL and server-side `SUPABASE_SECRET_KEY` configuration. Keep the secret key server-only; public clients can read only the auction tables and public images.

## Admin workflow

1. Sign in at `/admin` and open **Live Auctions → Auction Hosting**.
2. Create a tournament. The generated slug is the public URL, for example `/auction/quadclash-season-2`.
3. Configure each team's starting points, player base price, bid increment, and squad-size limits.
4. Add at least two teams and import a player workbook before starting the auction.
5. Optionally add sponsors and upload team/sponsor logos.
6. Optionally set a background and configure the projector's tournament logo and organizer-logo rotation in tournament setup.
7. Download the Excel player template, fill it in, and upload it before starting. Individual player details can also be edited from the player list.
8. Before starting, edit a team's name/logo or delete it from the Teams section; team details are locked after the auction starts.
9. Open the separate **Run auction** page from the tournament setup page. Start the auction there, then call a player randomly, randomly within a category, or directly by player number. The player table can call any player or re-auction a sold/unsold player. Enter the bid amount and click a team button to make it the highest bidder, then use **Sold**, **Unsold**, or **Skip**.

Rules and player imports are locked after the auction starts. An auction can be paused and resumed. Public pages are view-only.

## Player workbook

Import `.xlsx` or `.xls` with one player per row in the first worksheet. `Name` (or `First Name` and `Last Name`) is required. `Category` is recommended; if absent, `Role` is used as the category. Player number can be omitted; the row number is used. Optional recognized columns include `Role`, `Batting Style`, `Bowling Style`, `Previous Team`, and `Photo URL`. Other registration columns, including mobile number and ITS ID, are not stored in the public auction player pool.

Player numbers must be unique within the tournament. The import adds rows and does not overwrite an existing player or auction result.

## Public pages

- `/auction` lists auctions that have started.
- `/auction/{tournament-slug}` shows the live overview.
- `/auction/{tournament-slug}/summary` shows team budgets and points.
- `/auction/{tournament-slug}/players` filters the player list by status and category.
- `/auction/{tournament-slug}/{team-slug}` shows an individual team's budget and purchased players.
- `/auction/{tournament-slug}/projector` is the fullscreen projector display with Live, Teams, and Players tabs. It has no site header or footer and uses a fixed viewport with pagination instead of page scrolling.

Public and projector pages use the background configured in admin and subscribe to Supabase Realtime for immediate auction and team updates. Teams without uploaded logos display an initials-based team mark. The projector rotates organizer logos on the left and sponsor logos on the right, with the tournament logo and name in the center.

Share `/auction/{tournament-slug}` with viewers. They do not need to sign in. Viewers can use the page navigation to open the team summary, full player list, or an individual team page. The public `/auction` page lists tournaments after they have started.
