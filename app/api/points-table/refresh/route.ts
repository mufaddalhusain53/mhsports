import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const maxDuration = 60;

const TOURNAMENT_URL = "https://cricheroes.com/tournament/2206973/friendship-cup-s7/point-table";

async function fetchStandingsHtml() {
  const response = await fetch(TOURNAMENT_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://cricheroes.com/",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`CricHeroes returned HTTP ${response.status}`);
  return response.text();
}

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const syncSecret = process.env.FC_SYNC_SECRET;
  if (!supabaseUrl || !anonKey || !syncSecret) {
    return NextResponse.json({ error: "Points-table refresh is not configured on the server." }, { status: 503 });
  }

  const endpoint = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/cricheroes-sync`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
        "x-sync-secret": syncSecret,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
    let body = await response.json().catch(() => ({}));
    // CricHeroes rejects Supabase's Deno egress in some regions. Retry the
    // public fetch through this authenticated Node route, while the Edge
    // Function continues to validate and persist the standings.
    if (body.error === "CricHeroes returned HTTP 403") {
      const html = await fetchStandingsHtml();
      const fallback = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
          "x-sync-secret": syncSecret,
        },
        body: JSON.stringify({ html }),
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      });
      body = await fallback.json().catch(() => ({}));
      if (!fallback.ok || body.ok !== true) {
        return NextResponse.json(
          { error: body.error ?? `Sync failed (${fallback.status})` },
          { status: fallback.ok ? 502 : fallback.status },
        );
      }
      return NextResponse.json(body);
    }
    if (!response.ok || body.ok !== true) {
      return NextResponse.json(
        { error: body.error ?? `Sync failed (${response.status})` },
        { status: response.ok ? 502 : response.status },
      );
    }
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: "Could not reach the Supabase sync function." }, { status: 502 });
  }
}
