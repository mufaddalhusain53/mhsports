import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("auction_tournaments")
    .select("id,slug,name,status,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: `Unable to load auctions: ${error.message}. Apply the live auction migration in Supabase.` },
      { status: 500 }
    );
  }
  return NextResponse.json({ tournaments: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  let body: { name?: unknown; slug?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A tournament name and optional slug are required." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = slugify(typeof body.slug === "string" && body.slug.trim() ? body.slug : name);
  if (!name || name.length > 120 || !slug) {
    return NextResponse.json({ error: "Enter a tournament name and a valid URL slug." }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("auction_tournaments")
    .insert({ name, slug })
    .select("id,slug,name,status,created_at")
    .single();
  if (error) {
    return NextResponse.json(
      { error: error.code === "23505" ? "That tournament URL is already in use." : `Unable to create tournament: ${error.message}` },
      { status: error.code === "23505" ? 409 : 500 }
    );
  }
  return NextResponse.json({ tournament: data }, { status: 201 });
}
