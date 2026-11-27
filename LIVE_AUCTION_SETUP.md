# Live auction setup

## Supabase

Run these migrations in order in the Supabase SQL Editor:

1. `supabase/migrations/202610190002_live_auctions.sql`
2. `supabase/migrations/202610190003_auction_background.sql`
3. `supabase/migrations/202610190004_auction_console_projector.sql`
4. `supabase/migrations/202610190005_auction_result_display.sql`
5. Apply the remaining auction rule migrations in timestamp order, including `202610190006_bid_increment_rules.sql`, `202610200001_auction_team_reserve.sql`, `202611040001_auction_team_rtm.sql`, `202611040002_auction_rtm_reauction.sql`, `202611180001_auction_categories.sql`, `202611180002_auction_mode_reset.sql`, `202611180003_auction_scheduled_date.sql`, and `202611180004_auction_performance.sql`.
6. Apply `supabase/migrations/202611270001_auction_rtm_visibility.sql` before deploying the RTM visibility setting.
7. Apply `supabase/migrations/202611270002_auction_category_realtime.sql` to enable live updates of category opening prices.
8. Apply `supabase/migrations/202611270003_projector_player_fields.sql` before deploying projector profile field settings.
9. Apply `supabase/migrations/202611270004_projector_theme.sql` before deploying projector theme settings.

Together, they create the auction tables, category-specific opening prices and per-team minimum/maximum player limits, read-only public policies, atomic bid/sale functions, the public image bucket, Realtime publication entries, tournament background and presentation-logo settings, live-console operations for skipping and re-auctioning players, persistent current-player sold/unsold results, and an index for per-bid team roster validation. Existing player categories are backfilled with the tournament's current base price and maximum squad size.

The app uses the existing Supabase URL and server-side `SUPABASE_SECRET_KEY` configuration. Keep the secret key server-only; public clients can read only the auction tables and public images.

## Admin workflow

1. Sign in at `/admin` and open **Live Auctions → Auction Hosting**.
2. Create a tournament. The generated slug is the public URL, for example `/auction/quadclash-season-2`.
3. Use the **Overview** tab to set the optional auction date, whether RTM is shown to viewers, the projector theme, and which player detail fields are displayed on the projector and viewer pages. Theme 1 is the existing layout; Theme 2 is a spotlight layout. Turning RTM off hides its counts and result labels on viewer pages; it does not change auction rules or team RTM counts. Before the auction starts, the viewer page displays “Auction scheduled for [date]”. Configure each team's starting points, player base price, bid increment, and squad-size limits in **Categories & Rules**.
4. Add at least two teams and import player data whose Category values match the configured category names before starting the auction.
5. Optionally add sponsors and upload team/sponsor logos.
6. Use **Branding** to optionally set a background and configure the projector's tournament logo and organizer-logo rotation.
7. Download the Excel player template, fill it in, and upload it from **Players** before starting. Individual player details can also be edited from the same tab.
8. Before starting, edit a team's name/logo or delete it from the **Teams** tab; team details are locked after the auction starts.
9. Open the separate **Run auction** page from the tournament setup page. Choose **Trial Mode** for practice (resets do not require a password) or **Live** for the real auction (mode changes and resets require the configured `ADMIN_PIN`). Start the auction there, select a next player randomly or in sequence, optionally filter by category, or call a player directly by number. The player table can call any player or re-auction a sold/unsold player. Enter the bid amount and click a team button to make it the highest bidder, then use **Sold**, **Unsold**, or **Skip**.

Category rules remain editable after the auction starts. Changes apply to subsequent bids; a category maximum cannot be lowered below a team's already-sold count, and a base price cannot be raised above the current bid for its active player. Categories with assigned players cannot be deleted. Player imports are locked after the auction starts. Bids use the current player's category base price, category maximums are enforced per team, and available budgets reserve funds for category and tournament squad minimums. An auction cannot start if there are not enough players to satisfy configured category minimums, or be completed until each team satisfies those minimums. Use Reset auction to return all players to available, restore team starting points and used RTMs, clear the current player/bid, and return the tournament to setup while preserving its configuration. Mode changes require the admin PIN. Public pages are view-only.

## Player workbook

Import `.xlsx` or `.xls` with one player per row in the first worksheet. `Name` (or `First Name` and `Last Name`) is required. `Category` is required and must match a category configured for the tournament; if absent, `Role` is used as the category. Player number can be omitted; the row number is used. Optional recognized columns include `Role`, `Batting Style`, `Bowling Style`, `Previous Team`, and `Photo URL`. Other registration columns, including mobile number and ITS ID, are not stored in the public auction player pool.

Player number is the matching key within a tournament. Uploading a number that already exists updates that player's details, including category, from the workbook; new numbers are added. Uploads are available only while the tournament is in setup.

## Public pages

- `/auction` lists auctions that have started.
- `/auction/{tournament-slug}` shows the live overview.
- `/auction/{tournament-slug}/summary` shows team budgets and points.
- `/auction/{tournament-slug}/players` filters the player list by status and category.
- `/auction/{tournament-slug}/{team-slug}` shows an individual team's budget and purchased players.
- `/auction/{tournament-slug}/projector` is the fullscreen projector display with Live, Teams, and Players tabs. Select a team on the Teams tab to view its squad. It has no site header or footer; the Players list can be searched and filtered by status or category and scrolls within the fixed viewport, while teams and squads use pagination.
- `/auction/{tournament-slug}/overlay` is a transparent live-stream overlay styled with a player-details card, centered shield portrait, and team/player-count/points table. Add this URL as an OBS Browser Source (1920 × 1080) and place it above the video source; the graphic is anchored near the bottom and updates live.

Public and projector pages use the background configured in admin and subscribe to Supabase Realtime for immediate auction and team updates. Teams without uploaded logos display an initials-based team mark. The projector rotates organizer logos on the left and sponsor logos on the right, with the tournament logo and name in the center.

Before the first bid, the console, viewer, projector, and stream overlay display the player's category base price, or the tournament base price if no category is available. Once a bid is placed, they display the actual bid.

Share `/auction/{tournament-slug}` with viewers. They do not need to sign in. The viewer displays tournament sponsors in a moving strip above the navigation; the Sponsor tab shows their full details. Viewers can use the page navigation to open the team summary, full player list, or an individual team page. The public `/auction` page lists tournaments after they have started.
