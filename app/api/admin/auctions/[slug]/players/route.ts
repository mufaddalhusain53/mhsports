import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type PlayerImport = {
  player_number: number;
  full_name: string;
  category: string;
  role?: string | null;
  batting_style?: string | null;
  bowling_style?: string | null;
  previous_team?: string | null;
  photo_url?: string | null;
};
type Context = { params: Promise<{ slug: string }> };

function validOptionalUrl(value: string | null | undefined) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request, { params }: Context) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const { slug } = await params;
  let body: { players?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A player list is required." }, { status: 400 });
  }
  if (!Array.isArray(body.players) || body.players.length < 1 || body.players.length > 2000) {
    return NextResponse.json({ error: "Import between 1 and 2,000 players at a time." }, { status: 400 });
  }

  const players: PlayerImport[] = [];
  const numbers = new Set<number>();
  for (const raw of body.players) {
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "The spreadsheet contains an invalid player row." }, { status: 400 });
    }
    const row = raw as Record<string, unknown>;
    const number = Number(row.player_number);
    const name = typeof row.full_name === "string" ? row.full_name.trim() : "";
    const category = typeof row.category === "string" ? row.category.trim() : "";
    const role = typeof row.role === "string" ? row.role.trim() : "";
    const battingStyle = typeof row.batting_style === "string" ? row.batting_style.trim() : "";
    const bowlingStyle = typeof row.bowling_style === "string" ? row.bowling_style.trim() : "";
    const previousTeam = typeof row.previous_team === "string" ? row.previous_team.trim() : "";
    const photoUrl = typeof row.photo_url === "string" ? row.photo_url.trim() : "";
    if (!Number.isInteger(number) || number < 1 || !name || name.length > 160 || !category || category.length > 80 ||
        role.length > 100 || battingStyle.length > 100 || bowlingStyle.length > 100 || previousTeam.length > 120 ||
        !validOptionalUrl(photoUrl)) {
      return NextResponse.json({ error: "Each row needs a positive player number, name, category, and valid optional photo URL." }, { status: 400 });
    }
    if (numbers.has(number)) {
      return NextResponse.json({ error: `Player number ${number} appears more than once in the spreadsheet.` }, { status: 400 });
    }
    numbers.add(number);
    players.push({
      player_number: number, full_name: name, category, role: role || null,
      batting_style: battingStyle || null, bowling_style: bowlingStyle || null,
      previous_team: previousTeam || null, photo_url: photoUrl || null,
    });
  }

  const { data: tournament, error: lookupError } = await supabaseAdmin
    .from("auction_tournaments").select("id,status").eq("slug", slug).maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!tournament) return NextResponse.json({ error: "Auction tournament not found." }, { status: 404 });
  const insertRows = players.map((player) => ({ ...player, tournament_id: tournament.id }));
  const { error } = await supabaseAdmin.from("auction_players")
    .upsert(insertRows, { onConflict: "tournament_id,player_number" });
  if (error) {
    return NextResponse.json({
      error: error.code === "23505"
        ? "One or more player numbers conflict with an existing record."
        : `Unable to import players: ${error.message}`,
    }, { status: error.code === "23505" ? 409 : 500 });
  }
  return NextResponse.json({ imported: players.length }, { status: 201 });
}

export async function PATCH(request: Request, { params }: Context) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const { slug } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A valid player record is required." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const playerNumber = Number(body.player_number);
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";
  const battingStyle = typeof body.batting_style === "string" ? body.batting_style.trim() : "";
  const bowlingStyle = typeof body.bowling_style === "string" ? body.bowling_style.trim() : "";
  const previousTeam = typeof body.previous_team === "string" ? body.previous_team.trim() : "";
  const photoUrl = typeof body.photo_url === "string" ? body.photo_url.trim() : "";
  if (!id || !Number.isInteger(playerNumber) || playerNumber < 1 ||
      !fullName || fullName.length > 160 || !category || category.length > 80 ||
      role.length > 100 || battingStyle.length > 100 || bowlingStyle.length > 100 ||
      previousTeam.length > 120 || !validOptionalUrl(photoUrl)) {
    return NextResponse.json({ error: "Enter a valid player number, name, category, and optional photo URL." }, { status: 400 });
  }
  const { data: tournament, error: tournamentError } = await supabaseAdmin
    .from("auction_tournaments").select("id").eq("slug", slug).maybeSingle();
  if (tournamentError) return NextResponse.json({ error: tournamentError.message }, { status: 500 });
  if (!tournament) return NextResponse.json({ error: "Auction tournament not found." }, { status: 404 });

  const { data, error } = await supabaseAdmin.from("auction_players")
    .update({
      player_number: playerNumber,
      full_name: fullName,
      category,
      role: role || null,
      batting_style: battingStyle || null,
      bowling_style: bowlingStyle || null,
      previous_team: previousTeam || null,
      photo_url: photoUrl || null,
    })
    .eq("id", id)
    .eq("tournament_id", tournament.id)
    .select("id")
    .maybeSingle();
  if (error) {
    return NextResponse.json({
      error: error.code === "23505" ? `Player number ${playerNumber} is already in use.` : `Unable to update player: ${error.message}`,
    }, { status: error.code === "23505" ? 409 : 500 });
  }
  if (!data) return NextResponse.json({ error: "Player not found in this tournament." }, { status: 404 });
  return NextResponse.json({ success: true });
}
