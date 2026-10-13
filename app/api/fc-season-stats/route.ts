import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const CATEGORIES = new Set(["batting", "bowling", "fielding", "mvp"]);

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("fc_season_stats_raw")
    .select("season, category, file_name, csv_content, updated_at")
    .order("season", { ascending: true });
  if (error) return NextResponse.json({ error: "Unable to load season stats." }, { status: 500 });
  return NextResponse.json({ files: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const form = await request.formData();
  const season = Number(form.get("season"));
  const category = String(form.get("category") ?? "").toLowerCase();
  const file = form.get("file");
  if (!Number.isInteger(season) || season < 1 || season > 7 || !CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Choose a valid season and category." }, { status: 400 });
  }
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Upload a CSV file." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "CSV must be 10 MB or smaller." }, { status: 413 });
  const csvContent = await file.text();
  if (!csvContent.trim() || !csvContent.includes(",")) return NextResponse.json({ error: "The CSV appears empty or invalid." }, { status: 400 });
  const { error } = await supabaseAdmin.from("fc_season_stats_raw").upsert({
    season, category, file_name: file.name, csv_content: csvContent, updated_at: new Date().toISOString(),
  }, { onConflict: "season,category" });
  if (error) return NextResponse.json({ error: `Could not save CSV: ${error.message}` }, { status: 500 });
  return NextResponse.json({ success: true, season, category, fileName: file.name });
}
