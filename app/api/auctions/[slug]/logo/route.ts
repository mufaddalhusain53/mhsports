import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Context = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Context) {
  const { slug } = await params;
  const { data, error } = await supabaseAdmin
    .from("auction_tournaments")
    .select("tournament_logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: `Unable to load tournament logo: ${error.message}` }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Auction tournament not found." }, { status: 404 });

  return NextResponse.redirect(data.tournament_logo_url || new URL("/mhsports-logo.png", request.url), {
    headers: { "Cache-Control": "no-store" },
  });
}
