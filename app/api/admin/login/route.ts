import { NextResponse } from "next/server";
import { createAdminSession, verifyAdminPin, verifyViewerPin } from "../../../../lib/admin/auth";

export async function POST(request: Request) {
  let body: { pin?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "A valid login request is required." }, { status: 400 });
  }

  if (typeof body?.pin !== "string" || !body.pin) {
    return NextResponse.json({ success: false, message: "Enter a valid PIN." }, { status: 400 });
  }

  try {
    if (verifyAdminPin(body.pin)) {
      if (process.env.ADMIN_VIEWER_PIN) verifyViewerPin(body.pin);
      await createAdminSession("super");
      return NextResponse.json({ success: true });
    }

    if (!process.env.ADMIN_VIEWER_PIN) {
      return NextResponse.json({ success: false, message: "Incorrect PIN." }, { status: 401 });
    }

    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { data, error } = await supabaseAdmin.rpc("consume_admin_viewer_login_attempt");
    if (error || typeof data !== "boolean") {
      console.error("Could not check view-only login limit:", error ?? "Invalid response");
      return NextResponse.json({ success: false, message: "View-only login is unavailable. Check the admin login migration." }, { status: 503 });
    }
    if (!data) {
      return NextResponse.json({ success: false, message: "Too many login attempts. Try again later." }, { status: 429 });
    }
    if (!verifyViewerPin(body.pin)) {
      return NextResponse.json({ success: false, message: "Incorrect PIN." }, { status: 401 });
    }

    await createAdminSession("viewer");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to process admin login:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to process login.",
      },
      { status: 500 }
    );
  }
}