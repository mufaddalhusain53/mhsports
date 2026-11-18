import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const { data: tournament, error: tournamentError } = await supabaseAdmin
    .from("auction_tournaments")
    .select("id,slug,name,status,base_price,current_player_id,current_bid,current_bid_team_id,tournament_logo_url")
    .eq("slug", slug)
    .maybeSingle();
  if (tournamentError) {
    return NextResponse.json({ error: `Unable to load auction overlay: ${tournamentError.message}` }, { status: 500 });
  }
  if (!tournament) return NextResponse.json({ error: "Auction tournament not found." }, { status: 404 });

  const [teamsResult, playerResult, rosterResult] = await Promise.all([
    supabaseAdmin.from("auction_teams")
      .select("id,name,logo_url,points_remaining")
      .eq("tournament_id", tournament.id)
      .order("name"),
    tournament.current_player_id
      ? supabaseAdmin.from("auction_players")
        .select("id,player_number,full_name,category,role,batting_style,bowling_style,photo_url,status,sold_team_id,sold_price,rtm_team_id")
        .eq("tournament_id", tournament.id)
        .eq("id", tournament.current_player_id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabaseAdmin.from("auction_players")
      .select("sold_team_id")
      .eq("tournament_id", tournament.id)
      .eq("status", "sold"),
  ]);
  const failure = teamsResult.error ?? playerResult.error ?? rosterResult.error;
  if (failure) {
    return NextResponse.json({ error: `Unable to load auction overlay: ${failure.message}` }, { status: 500 });
  }

  const playerCounts = new Map<string, number>();
  for (const player of rosterResult.data ?? []) {
    if (player.sold_team_id) playerCounts.set(player.sold_team_id, (playerCounts.get(player.sold_team_id) ?? 0) + 1);
  }
  const teams = (teamsResult.data ?? []).map((team) => ({
    ...team,
    player_count: playerCounts.get(team.id) ?? 0,
  }));

  return NextResponse.json(
    { tournament, teams, player: playerResult.data },
    { headers: { "Cache-Control": "no-store" } }
  );
}
