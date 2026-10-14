import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOURNAMENT_KEY = "quad-clash-100-s1";
const TOURNAMENT_ID = "1987117";
const TOURNAMENT_URL = "https://cricheroes.com/tournament/1987117/quad-clash-100/point-table";

type Standing = {
  tournament_key: string; team_id: string; team_name: string; position: number;
  matches_played: number; won: number; lost: number; drawn: number; tied: number;
  no_result: number; points: number; net_run_rate: number; runs_for: string;
  runs_against: string; last_five: string; synced_at: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, "").trim());
    if (Number.isFinite(n)) return n;
  }
  return 0;
}
function str(v: unknown, fallback = ""): string { return v == null ? fallback : String(v); }
function first(o: Record<string, unknown>, keys: string[], fallback: unknown = 0): unknown {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return fallback;
}

function extractObject(text: string, start: number): Record<string, unknown> | null {
  if (text[start] !== "{") return null;
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\" && inString) { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    if (c === "}" && --depth === 0) {
      try {
        const value = JSON.parse(text.slice(start, i + 1));
        return value && typeof value === "object" && !Array.isArray(value)
          ? value as Record<string, unknown> : null;
      } catch { return null; }
    }
  }
  return null;
}

function parseStandings(html: string): Standing[] {
  // CricHeroes embeds standings in the Next.js RSC payload using escaped quotes.
  // Discover records by their field names; do not maintain a team-ID allowlist.
  const normalized = html.replace(/\\+"/g, '"').replace(/\\\\/g, "\\");
  const found = new Map<string, Standing>();
  const syncedAt = new Date().toISOString();

  for (const marker of ['"team_name"', '"Team Name"']) {
    let cursor = 0;
    while ((cursor = normalized.indexOf(marker, cursor)) !== -1) {
      const start = normalized.lastIndexOf("{", cursor);
      cursor += marker.length;
      if (start < 0) continue;
      const obj = extractObject(normalized, start);
      if (!obj) continue;

      const teamName = str(first(obj, ["team_name", "Team Name", "teamName"], "")).trim();
      const teamId = str(first(obj, ["team_id", "TeamID", "teamId", "teamID"], "")).trim();
      const hasStandingFields = ["matches", "Matches"].some(k => obj[k] !== undefined)
        && ["points", "Points"].some(k => obj[k] !== undefined)
        && ["won", "Won"].some(k => obj[k] !== undefined);
      if (!teamName || !teamId || !hasStandingFields) continue;

      const nrrRaw = first(obj, ["net_rr", "Net RR", "NetRR", "NRR"], 0);
      const nrr = typeof nrrRaw === "string" ? Number(nrrRaw) : num(nrrRaw);
      found.set(teamId, {
        tournament_key: TOURNAMENT_KEY,
        team_id: teamId,
        team_name: teamName,
        position: 0,
        matches_played: num(first(obj, ["matches", "Matches"], 0)),
        won: num(first(obj, ["won", "Won"], 0)),
        lost: num(first(obj, ["lost", "Lost"], 0)),
        drawn: num(first(obj, ["drawn", "Drawn"], 0)),
        tied: num(first(obj, ["tied", "Tied"], 0)),
        no_result: num(first(obj, ["no_result", "N/R", "NR", "noResult"], 0)),
        points: num(first(obj, ["points", "Points"], 0)),
        net_run_rate: Number.isFinite(nrr) ? nrr : 0,
        runs_for: str(first(obj, ["for", "For", "RunsFor"], "")),
        runs_against: str(first(obj, ["against", "Against", "RunsAgainst"], "")),
        last_five: str(first(obj, ["last_5", "Last 5", "Last5"], "")),
        synced_at: syncedAt,
      });
    }
  }

  const rows = [...found.values()];
  rows.sort((a, b) => b.points - a.points || b.net_run_rate - a.net_run_rate || a.team_name.localeCompare(b.team_name));
  rows.forEach((row, index) => { row.position = index + 1; });
  if (rows.length === 0) throw new Error("No standings parsed from CricHeroes HTML; cached standings were left unchanged.");
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Use POST" }, { status: 405, headers: corsHeaders });

  const syncSecret = Deno.env.get("FC_SYNC_SECRET");
  if (!syncSecret || req.headers.get("x-sync-secret") !== syncSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return Response.json({ error: "Missing Supabase function secrets" }, { status: 500, headers: corsHeaders });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  try {
    const response = await fetch(TOURNAMENT_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MHSportsQuadClashStandings/2.0)", "Accept": "text/html" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`CricHeroes returned HTTP ${response.status}`);
    const html = await response.text();
    if (!html.includes(TOURNAMENT_ID) || !html.toLowerCase().includes("quad clash 100")) {
      throw new Error("Response did not match the expected CricHeroes tournament.");
    }
    const standings = parseStandings(html);
    const { error: upsertError } = await admin.from("fc_points_standings").upsert(standings, { onConflict: "tournament_key,team_id" });
    if (upsertError) throw upsertError;
    const { error: logError } = await admin.from("fc_points_sync_runs").insert({
      tournament_key: TOURNAMENT_KEY, status: "success", team_count: standings.length,
      message: "Standings parsed dynamically from embedded CricHeroes data and saved.",
    });
    if (logError) console.error("Could not write success log", logError);
    return Response.json({
      ok: true, tournament: TOURNAMENT_KEY, team_count: standings.length,
      teams: standings.map(({ team_name, team_id, position, points, net_run_rate }) => ({ team_name, team_id, position, points, net_run_rate })),
      synced_at: standings[0]?.synced_at,
    }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await admin.from("fc_points_sync_runs").insert({ tournament_key: TOURNAMENT_KEY, status: "failed", team_count: 0, message: message.slice(0, 500) });
    console.error("CricHeroes sync failed:", message);
    return Response.json({ ok: false, error: message }, { status: 502, headers: corsHeaders });
  }
});
