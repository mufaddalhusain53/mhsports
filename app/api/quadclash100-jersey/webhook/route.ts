import { NextResponse } from "next/server";
import { checkJerseyOrder, getJerseyRequest, jerseyPaymentLink, verifyJerseyWebhook } from "@/lib/cashfree-jersey";
import { validJerseyId } from "@/lib/jersey-options";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (!verifyJerseyWebhook(body, request.headers.get("x-webhook-timestamp") ?? "", request.headers.get("x-webhook-signature") ?? "")) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }
    const event = JSON.parse(body);
    if (event.type === "PAYMENT_LINK_EVENT") {
      const linkId = event.data?.link_id;
      if (typeof linkId !== "string" || !linkId.startsWith("jersey_")) return NextResponse.json({ ok: true });
      const id = linkId.slice("jersey_".length);
      if (!validJerseyId(id)) return NextResponse.json({ error: "Invalid link." }, { status: 400 });
      const row = await getJerseyRequest(id);
      if (!row || row.payment_provider !== "cashfree_link") return NextResponse.json({ error: "Unknown link." }, { status: 404 });
      const result = await jerseyPaymentLink(row);
      if (event.data?.link_status === "PAID" && result.status !== "paid") return NextResponse.json({ error: "Payment not yet confirmed." }, { status: 503 });
      return NextResponse.json({ ok: true });
    }
    if (event.type !== "PAYMENT_SUCCESS_WEBHOOK" || event.data?.payment?.payment_status !== "SUCCESS") {
      return NextResponse.json({ ok: true });
    }
    const id = event.data?.order?.order_id;
    if (!validJerseyId(id)) return NextResponse.json({ ok: true });
    const row = await getJerseyRequest(id);
    if (!row || row.payment_provider !== "cashfree_order" || row.amount === 0) return NextResponse.json({ error: "Unknown order." }, { status: 404 });
    const order = await checkJerseyOrder(row);
    if (!order || order.order_status !== "PAID") return NextResponse.json({ error: "Payment not yet confirmed." }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not process Cashfree webhook:", error);
    return NextResponse.json({ error: "Could not process webhook." }, { status: 500 });
  }
}
