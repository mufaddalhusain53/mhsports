import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("auction_tournaments")
    .select("id,slug,name,status")
    .neq("status", "setup")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: `Unable to load auctions: ${error.message}` }, { status: 500 });
  return NextResponse.json({ tournaments: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
