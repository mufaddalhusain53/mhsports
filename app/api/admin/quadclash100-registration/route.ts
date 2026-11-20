import { NextResponse } from "next/server";
import { getAdminRole, isAdminAuthenticated } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  if (!(await getAdminRole())) {
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

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Admin authentication required." },
      { status: 401 }
    );
  }

  let body: { playerId?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A valid JSON request is required." },
      { status: 400 }
    );
  }

  const playerId = body?.playerId;
  if (typeof playerId !== "number" || !Number.isSafeInteger(playerId) || playerId < 1) {
    return NextResponse.json(
      { error: "A valid player ID is required." },
      { status: 400 }
    );
  }

  const { data: player, error: lookupError } = await supabaseAdmin
    .from("qc100_player_registrations")
    .select("photo_path")
    .eq("id", playerId)
    .maybeSingle();

  if (lookupError) {
    console.error("Could not load player registration for deletion:", lookupError);
    return NextResponse.json(
      { error: "Unable to load player registration. Please try again." },
      { status: 500 }
    );
  }
  if (!player) {
    return NextResponse.json(
      { error: "Player registration was not found. Refresh the list." },
      { status: 404 }
    );
  }
  if (typeof player.photo_path !== "string" || !player.photo_path.trim()) {
    console.error("Player registration has an invalid photo path:", playerId);
    return NextResponse.json(
      { error: "The player photo path is invalid. The registration was not deleted." },
      { status: 500 }
    );
  }

  const { error: photoError } = await supabaseAdmin.storage
    .from("qc100-player-photos")
    .remove([player.photo_path]);
  if (photoError) {
    console.error("Could not delete player photo:", photoError);
    return NextResponse.json(
      { error: "Unable to delete the player photo. The registration was not deleted; please try again." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("qc100_player_registrations")
    .delete()
    .eq("id", playerId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Could not delete player registration:", error);
    return NextResponse.json(
      { error: "The photo was deleted, but the registration could not be deleted. Please try again." },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "The photo was deleted, but the registration was not found. Refresh the list." },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
