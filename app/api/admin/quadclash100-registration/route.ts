import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Admin authentication required." },
      { status: 401 }
    );
  }

  const [{ data: setting, error: settingError }, { data: players, error }] =
    await Promise.all([
      supabaseAdmin
        .from("qc100_registration_settings")
        .select("enabled")
        .eq("id", 1)
        .single(),
      supabaseAdmin
        .from("qc100_player_registrations")
        .select(
          "id,first_name,last_name,phone_number,age,its_id,season1_team,role,batting_style,bowling_style,photo_url,auction_available,created_at"
        )
        .order("created_at", { ascending: false }),
    ]);

  if (settingError || error) {
    return NextResponse.json(
      {
        error:
          "Unable to load player registrations. Apply the QuadClash registration migration in Supabase.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { enabled: setting.enabled, players: players ?? [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Admin authentication required." },
      { status: 401 }
    );
  }

  let body: {
    enabled?: unknown;
    playerId?: unknown;
    auctionAvailable?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A valid JSON request is required." },
      { status: 400 }
    );
  }

  if (body.playerId !== undefined || body.auctionAvailable !== undefined) {
    if (
      !Number.isInteger(body.playerId) ||
      Number(body.playerId) < 1 ||
      typeof body.auctionAvailable !== "boolean"
    ) {
      return NextResponse.json(
        { error: "A valid player ID and auction availability are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("qc100_player_registrations")
      .update({ auction_available: body.auctionAvailable })
      .eq("id", Number(body.playerId))
      .select("id,auction_available")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: `Unable to update auction availability: ${error.message}` },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json(
        { error: "Player registration was not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      playerId: data.id,
      auctionAvailable: data.auction_available,
    });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "Registration enabled must be true or false." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("qc100_registration_settings")
    .update({ enabled: body.enabled, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("enabled")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: `Unable to update player registration settings: ${error.message}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ enabled: data.enabled });
}
