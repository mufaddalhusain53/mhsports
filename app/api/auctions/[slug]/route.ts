import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const { data, error } = await supabaseAdmin
    .from("auction_tournaments")
    .select("id,slug,name,status,scheduled_date,points_per_team,base_price,bid_increment,bid_increment_rules,min_squad_size,max_squad_size,current_player_id,current_bid,current_bid_team_id,background_url,tournament_logo_url,organizer_logo_urls,updated_at,teams:auction_teams!auction_teams_tournament_id_fkey(id,name,slug,logo_url,points_remaining,rtm_count),players:auction_players!auction_players_tournament_id_fkey(id,player_number,full_name,category,role,batting_style,bowling_style,previous_team,photo_url,status,sold_team_id,sold_price,rtm_team_id),sponsors:auction_sponsors!auction_sponsors_tournament_id_fkey(id,name,sponsor_title,logo_url,website_url,display_order)")
    .eq("slug", slug)
    .order("name", { referencedTable: "teams" })
    .order("player_number", { referencedTable: "players" })
    .order("display_order", { referencedTable: "sponsors" })
    .order("name", { referencedTable: "sponsors" })
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: `Unable to load auction: ${error.message}` }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  if (!data) return NextResponse.json({ error: "Auction tournament not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });

  const { teams, players, sponsors, ...tournament } = data;
  return NextResponse.json(
    { tournament, teams, players, sponsors },
    { headers: { "Cache-Control": "no-store" } }
  );
}
