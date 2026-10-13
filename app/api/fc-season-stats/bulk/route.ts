import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const CATEGORIES = ["batting", "bowling", "fielding", "mvp"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const form = await request.formData();
  const season = Number(form.get("season"));
  if (!Number.isInteger(season) || season < 1 || season > 7) return NextResponse.json({ error: "Choose a valid season." }, { status: 400 });

  const rows: { season: number; category: string; file_name: string; csv_content: string; updated_at: string }[] = [];
  for (const category of CATEGORIES) {
    const file = form.get(category);
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) return NextResponse.json({ error: `Choose a valid ${category} CSV file.` }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: `${category} CSV must be 10 MB or smaller.` }, { status: 413 });
    const csvContent = await file.text();
    if (!csvContent.trim() || !csvContent.includes(",")) return NextResponse.json({ error: `${category} CSV appears empty or invalid.` }, { status: 400 });
    rows.push({ season, category, file_name: file.name, csv_content: csvContent, updated_at: new Date().toISOString() });
  }

  const { error } = await supabaseAdmin.from("fc_season_stats_raw").upsert(rows, { onConflict: "season,category" });
  if (error) return NextResponse.json({ error: `Could not save season CSVs: ${error.message}` }, { status: 500 });
  return NextResponse.json({ success: true, season, uploaded: CATEGORIES });
}
