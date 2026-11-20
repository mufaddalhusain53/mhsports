import { NextResponse } from "next/server";
import { getAdminRole, isAdminAuthenticated } from "@/lib/admin/auth";
import { validJerseyId } from "@/lib/jersey-options";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  if (!(await getAdminRole())) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const [{ data: setting, error: settingError }, { data, error }] = await Promise.all([
    supabaseAdmin.from("qc100_jersey_settings").select("enabled").eq("id", 1).single(),
    supabaseAdmin.from("qc100_jersey_requests")
      .select("id,player_name,jersey_name,phone_number,team,jersey_size,jersey_option,amount,payment_status,payment_provider,created_at")
      .order("created_at", { ascending: false }),
  ]);
  if (settingError || error) {
    console.error("Could not load jersey requests:", settingError ?? error);
    return NextResponse.json({ error: "Unable to load jersey requests. Check the jersey database migration." }, { status: 500 });
  }
  return NextResponse.json({ enabled: setting.enabled, requests: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  let body: { enabled?: unknown; action?: unknown; id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
  }

  if (body?.action === "confirm_payment") {
    if (!validJerseyId(body.id)) return NextResponse.json({ error: "Invalid request reference." }, { status: 400 });
    const { data, error } = await supabaseAdmin.from("qc100_jersey_requests")
      .update({ payment_status: "paid", paid_at: new Date().toISOString() })
      .eq("id", body.id).eq("payment_status", "pending").eq("payment_provider", "manual_qr")
      .select("id,payment_status").maybeSingle();
    if (error) {
      console.error("Could not confirm jersey payment:", error);
      return NextResponse.json({ error: "Unable to confirm payment. Please try again." }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "This request is not awaiting manual payment confirmation. Refresh the page." }, { status: 409 });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  }
  if (!body || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Jersey form enabled must be true or false." }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.from("qc100_jersey_settings")
    .update({ enabled: body.enabled, updated_at: new Date().toISOString() })
    .eq("id", 1).select("enabled").single();
  if (error) {
    console.error("Could not update jersey form status:", error);
    return NextResponse.json({ error: "Unable to update jersey form status." }, { status: 500 });
  }
  return NextResponse.json({ enabled: data.enabled }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
  }
  if (!validJerseyId(body?.id)) return NextResponse.json({ error: "Invalid request reference." }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("qc100_jersey_requests")
    .delete().eq("id", body.id).select("id").maybeSingle();
  if (error) {
    console.error("Could not delete jersey request:", error);
    return NextResponse.json({ error: "Unable to delete jersey request. Please try again." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Jersey request not found. Refresh the page." }, { status: 404 });
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
