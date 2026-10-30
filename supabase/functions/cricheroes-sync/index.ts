import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOURNAMENT_KEY = "friendship-cup-s7";
const TOURNAMENT_ID = "2206973";
const TOURNAMENT_URL = "https://cricheroes.com/tournament/2206973/friendship-cup-s7/point-table";
const EXPECTED_TEAM_IDS = new Set([
  "14701762", "14701969", "14701818", "14701973",
  "14701764", "14701767", "14701770", "14701795",
]);

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
function str(v: unknown, fallback = ""): string {
  return v == null ? fallback : String(v);
}
function first(o: Record<string, unknown>, keys: string[], fallback: unknown = 0): unknown {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return fallback;
}

function findObjectStart(text: string, position: number): number {
  let inString = false;
  let depth = 0;
  for (let i = position - 1; i >= 0; i--) {
    const c = text[i];
    if (c === '"') {
      let backslashes = 0;
      for (let j = i - 1; j >= 0 && text[j] === "\\"; j--) backslashes++;
      if (backslashes % 2 === 0) inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "}") depth++;
    if (c === "{") {
      if (depth === 0) return i;
      depth--;
    }
  }
  return -1;
}

function parseStandings(html: string): Standing[] {
  const normalized = html.replace(/\\+"/g, '"').replace(/\\\\/g, "\\");
  const candidates: Record<string, unknown>[] = [];
  const markers = ['"Team Name"', '"team_name"'];
  for (const marker of markers) {
    let from = 0;
    while ((from = normalized.indexOf(marker, from)) !== -1) {
      const start = findObjectStart(normalized, from);
      if (start >= 0) {
        let quoted = false, escaped = false, depth = 0, end = -1;
        for (let i = start; i < normalized.length; i++) {
          const c = normalized[i];
          if (escaped) { escaped = false; continue; }
          if (c === "\\") { escaped = true; continue; }
          if (c === '"') { quoted = !quoted; continue; }
          if (!quoted) {
            if (c === "{") depth++;
            if (c === "}" && --depth === 0) { end = i + 1; break; }
          }
        }
        if (end > start) {
          try {
            const obj = JSON.parse(normalized.slice(start, end));
            if (obj && typeof obj === "object") candidates.push(obj);
          } catch { /* other embedded object; continue scanning */ }
        }
      }
      from += marker.length;
    }
  }

  const unique = new Map<string, Standing>();
  for (const raw of candidates) {
    const o = raw as Record<string, unknown>;
    const teamName = str(first(o, ["team_name", "Team Name", "teamName"])).trim();
    const teamId = str(first(o, ["team_id", "TeamID", "teamId", "teamID"], "")).trim();
    if (!teamName || !teamId || !EXPECTED_TEAM_IDS.has(teamId)) continue;
    const hasStandingsData = ["matches", "Matches"].some(key => o[key] !== undefined)
      && ["won", "Won"].some(key => o[key] !== undefined)
      && ["points", "Points"].some(key => o[key] !== undefined);
    if (!hasStandingsData) continue;
    const nrrRaw = first(o, ["net_rr", "Net RR", "NetRR", "NRR"], 0);
    const nrr = typeof nrrRaw === "string" ? Number(nrrRaw) : num(nrrRaw);
    const row: Standing = {
      tournament_key: TOURNAMENT_KEY,
      team_id: teamId,
      team_name: teamName.replace(/\s+FC$/i, ""),
      position: 0,
      matches_played: num(first(o, ["matches", "Matches"], 0)),
      won: num(first(o, ["won", "Won"], 0)),
      lost: num(first(o, ["lost", "Lost"], 0)),
      drawn: num(first(o, ["drawn", "Drawn"], 0)),
      tied: num(first(o, ["tied", "Tied"], 0)),
      no_result: num(first(o, ["no_result", "N/R", "NR", "noResult"], 0)),
      points: num(first(o, ["points", "Points"], 0)),
      net_run_rate: Number.isFinite(nrr) ? nrr : 0,
      runs_for: str(first(o, ["for", "For", "RunsFor"], "")),
      runs_against: str(first(o, ["against", "Against", "RunsAgainst"], "")),
      last_five: str(first(o, ["last_5", "Last 5", "Last5"], "")),
      synced_at: new Date().toISOString(),
    };
    unique.set(teamId, row);
  }
  const rows = [...unique.values()];
  rows.sort((a, b) => b.points - a.points || b.net_run_rate - a.net_run_rate || a.team_name.localeCompare(b.team_name));
  rows.forEach((r, i) => r.position = i + 1);
  if (rows.length !== EXPECTED_TEAM_IDS.size) {
    throw new Error(`Expected ${EXPECTED_TEAM_IDS.size} unique S7 teams; parsed ${rows.length}. Refusing to overwrite cached standings.`);
  }
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
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Missing Supabase function secrets" }, { status: 500, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  try {
    const supplied = await req.json().catch(() => null);
    let html = typeof supplied?.html === "string" ? supplied.html : "";
    if (html.length > 5_000_000) throw new Error("Supplied CricHeroes response is too large.");
    if (!html) {
      const response = await fetch(TOURNAMENT_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://cricheroes.com/",
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`CricHeroes returned HTTP ${response.status}`);
      html = await response.text();
    }
    if (!html.includes(TOURNAMENT_ID) || !html.toLowerCase().includes("friendship cup s7")) {
      throw new Error("Response did not match the expected CricHeroes tournament.");
    }
    const standings = parseStandings(html);
    const { error: upsertError } = await admin.from("fc_points_standings")
      .upsert(standings, { onConflict: "tournament_key,team_id" });
    if (upsertError) throw upsertError;

    const { error: logError } = await admin.from("fc_points_sync_runs").insert({
      tournament_key: TOURNAMENT_KEY, status: "success", team_count: standings.length,
      message: "All public standings rows validated and saved.",
    });
    if (logError) console.error("Could not write success log", logError);

    return Response.json({ ok: true, tournament: TOURNAMENT_KEY, team_count: standings.length, synced_at: standings[0]?.synced_at }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await admin.from("fc_points_sync_runs").insert({
      tournament_key: TOURNAMENT_KEY, status: "failed", team_count: 0, message: message.slice(0, 500),
    });
    console.error("CricHeroes sync failed:", message);
    return Response.json({ ok: false, error: message }, { status: 502, headers: corsHeaders });
  }
});
