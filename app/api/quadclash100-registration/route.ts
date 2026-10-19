import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "qc100-player-photos";
const MAX_PHOTO_SIZE = 4 * 1024 * 1024;
const TEAMS = new Set([
  "Ezzi United",
  "Multiplize highlanders",
  "Mavericks",
  "Strikers",
  "Not played",
]);
const ROLES = new Set(["Batsman", "Bowler", "Wicket Keeper", "All Rounder"]);
const BATTING_STYLES = new Set([
  "RH Top Order",
  "RH Middle Order",
  "RH Finisher",
  "RH Lower Order",
  "LH Top Order",
  "LH Middle Order",
  "LH Finisher",
  "LH Lower Order",
]);
const BOWLING_STYLES = new Set([
  "Right-Arm Medium",
  "Left-Arm Medium",
  "Off Spin",
  "Leg break",
  "Orthodox",
  "Chinaman",
]);

async function getRegistrationEnabled() {
  const { data, error } = await supabaseAdmin
    .from("qc100_registration_settings")
    .select("enabled")
    .eq("id", 1)
    .single();

  if (error) {
    return { enabled: false, error };
  }

  return { enabled: data.enabled, error: null };
}

export async function GET() {
  const { enabled, error } = await getRegistrationEnabled();
  if (error) {
    return NextResponse.json(
      {
        error:
          "Unable to check registration status. Apply the QuadClash registration migration in Supabase.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { enabled },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const { enabled, error: settingsError } = await getRegistrationEnabled();
  if (settingsError) {
    return NextResponse.json(
      { error: "Registration is temporarily unavailable." },
      { status: 500 }
    );
  }
  if (!enabled) {
    return NextResponse.json(
      { error: "Player registration is currently closed." },
      { status: 403 }
    );
  }

  const form = await request.formData();
  const firstName = String(form.get("first_name") ?? "").trim();
  const lastName = String(form.get("last_name") ?? "").trim();
  const phoneNumber = String(form.get("phone_number") ?? "");
  const ageValue = String(form.get("age") ?? "");
  const itsId = String(form.get("its_id") ?? "");
  const season1Team = String(form.get("season1_team") ?? "");
  const role = String(form.get("role") ?? "");
  const battingStyle = String(form.get("batting_style") ?? "");
  const bowlingStyle = String(form.get("bowling_style") ?? "");
  const photo = form.get("photo");
  const age = Number(ageValue);

  if (
    !firstName ||
    firstName.length > 100 ||
    !lastName ||
    lastName.length > 100 ||
    !/^[0-9]{10}$/.test(phoneNumber) ||
    !Number.isInteger(age) ||
    age < 1 ||
    age > 100 ||
    !/^[0-9]{8}$/.test(itsId) ||
    !TEAMS.has(season1Team) ||
    !ROLES.has(role) ||
    !BATTING_STYLES.has(battingStyle) ||
    !BOWLING_STYLES.has(bowlingStyle) ||
    form.get("consent") !== "yes"
  ) {
    return NextResponse.json(
      { error: "Check all required player details and consent." },
      { status: 400 }
    );
  }

  const { data: existingPlayer, error: duplicateCheckError } =
    await supabaseAdmin
      .from("qc100_player_registrations")
      .select("id")
      .eq("phone_number", `+91${phoneNumber}`)
      .eq("its_id", itsId)
      .limit(1)
      .maybeSingle();

  if (duplicateCheckError) {
    return NextResponse.json(
      { error: "Unable to verify whether this player is already registered." },
      { status: 500 }
    );
  }
  if (existingPlayer) {
    return NextResponse.json(
      { error: "You are already registered." },
      { status: 409 }
    );
  }

  if (!(photo instanceof File)) {
    return NextResponse.json(
      { error: "Choose a JPG or PNG player photo." },
      { status: 400 }
    );
  }
  if (photo.size === 0 || photo.size > MAX_PHOTO_SIZE) {
    return NextResponse.json(
      { error: "Player photo must be larger than 0 and no more than 4 MB." },
      { status: 413 }
    );
  }

  const image = Buffer.from(await photo.arrayBuffer());
  const isJpeg =
    photo.type === "image/jpeg" &&
    image.length >= 3 &&
    image[0] === 0xff &&
    image[1] === 0xd8 &&
    image[2] === 0xff;
  const isPng =
    photo.type === "image/png" &&
    image.length >= 8 &&
    image.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );

  if (!isJpeg && !isPng) {
    return NextResponse.json(
      { error: "Photo content must be a valid JPG or PNG image." },
      { status: 415 }
    );
  }

  const photoPath = `${crypto.randomUUID()}.${isJpeg ? "jpg" : "png"}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(photoPath, image, {
      contentType: isJpeg ? "image/jpeg" : "image/png",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        error:
          'Unable to upload the player photo. Check the public "qc100-player-photos" Supabase Storage bucket.',
      },
      { status: 500 }
    );
  }

  const { data: photoData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(photoPath);

  const { error: insertError } = await supabaseAdmin
    .from("qc100_player_registrations")
    .insert({
      first_name: firstName,
      last_name: lastName,
      phone_number: `+91${phoneNumber}`,
      age,
      its_id: itsId,
      season1_team: season1Team,
      role,
      batting_style: battingStyle,
      bowling_style: bowlingStyle,
      photo_path: photoPath,
      photo_url: photoData.publicUrl,
      consent_accepted: true,
      consented_at: new Date().toISOString(),
    });

  if (insertError) {
    const { error: cleanupError } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([photoPath]);

    if (
      insertError.code === "23505" &&
      insertError.message.includes(
        "qc100_player_registrations_its_id_phone_number_unique"
      )
    ) {
      return NextResponse.json(
        { error: "You are already registered." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: cleanupError
          ? "The registration could not be saved, and the uploaded photo could not be cleaned up. Contact the tournament administrator."
          : "The registration could not be saved. Please try again.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
