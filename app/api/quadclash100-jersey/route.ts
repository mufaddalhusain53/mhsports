import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { jerseyOptions, jerseyPrice, jerseySizes, jerseyTeams, validJerseyId } from "@/lib/jersey-options";

async function jerseyFormStatus() {
  return supabaseAdmin.from("qc100_jersey_settings").select("enabled").eq("id", 1).single();
}

export async function GET() {
  const { data, error } = await jerseyFormStatus();
  if (error) {
    console.error("Could not load jersey form status:", error);
    return NextResponse.json({ error: "Unable to check jersey form status. Please try again later." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ enabled: data.enabled }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const { data: setting, error: settingError } = await jerseyFormStatus();
  if (settingError) {
    console.error("Could not load jersey form status:", settingError);
    return NextResponse.json({ error: "Jersey requests are temporarily unavailable." }, { status: 500 });
  }
  if (!setting.enabled) return NextResponse.json({ error: "The jersey form is currently closed." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Provide valid jersey request details." }, { status: 400 });
  }
  const { id } = body;
  const playerName = typeof body.player_name === "string" ? body.player_name.trim() : "";
  const jerseyName = typeof body.jersey_name === "string" ? body.jersey_name.trim() : "";
  const team = typeof body.team === "string" ? body.team : "";
  const size = typeof body.jersey_size === "string" ? body.jersey_size : "";
  const option = typeof body.jersey_option === "string" ? body.jersey_option : "";
  const amount = jerseyPrice(option);
  if (!validJerseyId(id) || !playerName || playerName.length > 100 || !jerseyName || jerseyName.length > 100 ||
    !jerseyTeams.some((item) => item === team) ||
    !jerseySizes.some((item) => item === size) || !jerseyOptions.some((item) => item.value === option) || amount === undefined) {
    return NextResponse.json({ error: "Check all jersey details." }, { status: 400 });
  }

  const values = { id, player_name: playerName, jersey_name: jerseyName, team, jersey_size: size, jersey_option: option, amount, payment_status: amount === 0 ? "free" : "pending", payment_provider: amount === 0 ? null : "manual_qr" };
  const { error } = await supabaseAdmin.from("qc100_jersey_requests").insert(values);
  if (error) {
    if (error.code === "23505") {
      const { data: existing, error: lookupError } = await supabaseAdmin.from("qc100_jersey_requests")
        .select("player_name,jersey_name,team,jersey_size,jersey_option,amount,payment_status,payment_provider").eq("id", id).maybeSingle();
      if (lookupError) {
        console.error("Could not check existing jersey request:", lookupError);
        return NextResponse.json({ error: "Could not verify the submitted jersey request. Please try again." }, { status: 500 });
      }
      if (existing && existing.player_name === playerName && existing.jersey_name === jerseyName &&
        existing.team === team && existing.jersey_size === size &&
        existing.jersey_option === option && existing.amount === amount &&
        (amount === 0 ? existing.payment_status === "free" && existing.payment_provider === null :
          ["pending", "paid"].includes(existing.payment_status) && existing.payment_provider === "manual_qr")) {
        return NextResponse.json({ success: true, amount, status: existing.payment_status });
      }
      return NextResponse.json({ error: "A request with this reference already exists. Contact the organizers before resubmitting." }, { status: 409 });
    }
    console.error("Could not save jersey request:", error);
    return NextResponse.json({ error: "Could not save your jersey request. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ success: true, amount, status: values.payment_status }, { status: 201 });
}
