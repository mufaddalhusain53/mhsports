import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const TOURNAMENT_KEY = "friendship-cup-s7";

type InputRow = {
  team_id?: unknown; position?: unknown; matches_played?: unknown; won?: unknown; lost?: unknown;
  drawn?: unknown; tied?: unknown; no_result?: unknown; points?: unknown; net_run_rate?: unknown;
  runs_for?: unknown; runs_against?: unknown; last_five?: unknown;
};

const integer = (value: unknown) => Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
const decimal = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
const text = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 80) : "";

async function currentTeams() {
  const { data, error } = await supabaseAdmin.from("fc_points_standings")
    .select("team_id,team_name").eq("tournament_key", TOURNAMENT_KEY).order("position");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  try {
    const teams = await currentTeams();
    if (teams.length !== 8) return NextResponse.json({ error: "The current eight Friendship Cup teams are not available yet." }, { status: 409 });
    return NextResponse.json({ teams });
  } catch {
    return NextResponse.json({ error: "Could not load the current points-table teams." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { rows?: InputRow[] } | null;
  if (!Array.isArray(body?.rows) || body.rows.length !== 8) return NextResponse.json({ error: "Provide all eight standings rows." }, { status: 400 });
  try {
    const teams = await currentTeams();
    const teamNames = new Map(teams.map((team) => [team.team_id, team.team_name]));
    if (teamNames.size !== 8) return NextResponse.json({ error: "The current eight Friendship Cup teams are not available yet." }, { status: 409 });
    const now = new Date().toISOString();
    const ids = new Set<string>();
    const positions = new Set<number>();
    const rows = body.rows.map((row) => {
      const teamId = typeof row.team_id === "string" ? row.team_id : "";
      const position = integer(row.position);
      const matches = integer(row.matches_played); const won = integer(row.won); const lost = integer(row.lost);
      const drawn = integer(row.drawn); const tied = integer(row.tied); const noResult = integer(row.no_result);
      const points = decimal(row.points); const nrr = decimal(row.net_run_rate);
      if (!teamNames.has(teamId) || position === null || position < 1 || position > 8 || matches === null || won === null || lost === null || drawn === null || tied === null || noResult === null || points === null || nrr === null) throw new Error("Check each team, position, and numeric value before saving.");
      ids.add(teamId); positions.add(position);
      return { tournament_key: TOURNAMENT_KEY, team_id: teamId, team_name: teamNames.get(teamId), position, matches_played: matches, won, lost, drawn, tied, no_result: noResult, points, net_run_rate: nrr, runs_for: text(row.runs_for), runs_against: text(row.runs_against), last_five: text(row.last_five), synced_at: now };
    });
    if (ids.size !== 8 || positions.size !== 8) return NextResponse.json({ error: "Each of the eight teams and positions 1–8 must be used once." }, { status: 400 });
    const { error } = await supabaseAdmin.from("fc_points_standings").upsert(rows, { onConflict: "tournament_key,team_id" });
    if (error) throw error;
    await supabaseAdmin.from("fc_points_sync_runs").insert({ tournament_key: TOURNAMENT_KEY, status: "success", team_count: 8, message: "Standings uploaded from an administrator-reviewed CricHeroes PDF." });
    return NextResponse.json({ ok: true, team_count: 8 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the uploaded standings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
