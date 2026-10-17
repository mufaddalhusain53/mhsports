import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";

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
    const body = await response.json().catch(() => ({}));
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
