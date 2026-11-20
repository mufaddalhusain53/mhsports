import { NextResponse } from "next/server";
import { getJerseyRequest } from "@/lib/cashfree-jersey";
import { validJerseyId } from "@/lib/jersey-options";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("request");
  if (!validJerseyId(id)) return NextResponse.json({ error: "Invalid request reference." }, { status: 400 });
  try {
    const row = await getJerseyRequest(id);
    if (!row) return NextResponse.json({ error: "Jersey request not found." }, { status: 404 });
    const manual = row.payment_provider === "manual_qr";
    return NextResponse.json({
      status: row.payment_status,
      amount: row.amount,
      manual,
      message: row.payment_status === "pending" && !manual
        ? "This is an earlier request. Contact the organizers before making another payment."
        : undefined,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not process jersey payment:", error);
    return NextResponse.json({ error: "Unable to check payment. Please retry or contact the organizers." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
