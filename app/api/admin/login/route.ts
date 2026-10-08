import { NextResponse } from "next/server";
import { createAdminSession } from "../../../../lib/admin/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pin = String(body.pin ?? "");

    const correctPin = process.env.ADMIN_PIN;

    if (!correctPin) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin PIN is not configured.",
        },
        { status: 500 }
      );
    }

    if (pin !== correctPin) {
      return NextResponse.json(
        {
          success: false,
          message: "Incorrect PIN.",
        },
        { status: 401 }
      );
    }

    await createAdminSession();

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to process login.",
      },
      { status: 500 }
    );
  }
}