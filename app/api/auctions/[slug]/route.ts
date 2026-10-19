import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const { data: tournament, error: tournamentError } = await supabaseAdmin
    .from("auction_tournaments")
    .select("id,slug,name,status,points_per_team,base_price,bid_increment,bid_increment_rules,min_squad_size,max_squad_size,current_player_id,current_bid,current_bid_team_id,background_url,tournament_logo_url,organizer_logo_urls,updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (tournamentError) {
    return NextResponse.json({ error: `Unable to load auction: ${tournamentError.message}` }, { status: 500 });
  }
  if (!tournament) return NextResponse.json({ error: "Auction tournament not found." }, { status: 404 });

  const [teamsResult, playersResult, sponsorsResult] = await Promise.all([
    supabaseAdmin.from("auction_teams").select("id,name,slug,logo_url,points_remaining").eq("tournament_id", tournament.id).order("name"),
    supabaseAdmin.from("auction_players").select("id,player_number,full_name,category,role,batting_style,bowling_style,previous_team,photo_url,status,sold_team_id,sold_price").eq("tournament_id", tournament.id).order("player_number"),
    supabaseAdmin.from("auction_sponsors").select("id,name,logo_url,website_url,display_order").eq("tournament_id", tournament.id).order("display_order").order("name"),
  ]);
  const failure = teamsResult.error ?? playersResult.error ?? sponsorsResult.error;
  if (failure) return NextResponse.json({ error: `Unable to load auction data: ${failure.message}` }, { status: 500 });
  return NextResponse.json(
    { tournament, teams: teamsResult.data ?? [], players: playersResult.data ?? [], sponsors: sponsorsResult.data ?? [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
