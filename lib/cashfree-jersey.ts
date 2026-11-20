import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyCashfreeSignature } from "@/lib/cashfree-signature";
import { hasPaidCashfreeOrder, validCashfreeLink, type CashfreeLink, type CashfreeOrder } from "@/lib/cashfree-link";

export type JerseyRequest = {
  id: string;
  player_name: string;
  amount: number;
  payment_status: "not_collected" | "free" | "pending" | "paid";
  payment_provider: "cashfree_order" | "cashfree_link" | "manual_qr" | null;
};

function config() {
  const { CASHFREE_CLIENT_ID: id, CASHFREE_CLIENT_SECRET: secret, CASHFREE_ENV: mode, JERSEY_SITE_URL: site } = process.env;
  if (!id || !secret || (mode !== "sandbox" && mode !== "production") || !site) {
    throw new Error("Cashfree is not configured. Contact the tournament administrator.");
  }
  const url = new URL(site);
  if (url.protocol !== "https:") throw new Error("Cashfree requires a public HTTPS site URL.");
  return { id, secret, mode, site: url.origin, base: mode === "sandbox" ? "https://sandbox.cashfree.com/pg" : "https://api.cashfree.com/pg" };
}

export function verifyJerseyWebhook(body: string, timestamp: string, signature: string): boolean {
  const { secret } = config();
  return verifyCashfreeSignature(body, timestamp, signature, secret);
}

async function requestCashfree<T>(path: string, init?: RequestInit, allowNotFound = false): Promise<T | null> {
  const { id, secret, base } = config();
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-client-id": id, "x-client-secret": secret, "x-api-version": "2025-01-01", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (response.status === 404 && allowNotFound) return null;
  if (!response.ok) {
    console.error("Cashfree request failed:", response.status);
    throw new Error("Unable to reach the payment provider. Please retry or contact the organizers.");
  }
  return response.json();
}

export async function getJerseyRequest(id: string): Promise<JerseyRequest | null> {
  const { data, error } = await supabaseAdmin.from("qc100_jersey_requests")
    .select("id,player_name,amount,payment_status,payment_provider").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load jersey request: ${error.message}`);
  return data;
}

export async function checkJerseyOrder(row: JerseyRequest): Promise<CashfreeOrder | null> {
  const order = await requestCashfree<CashfreeOrder>(`/orders/${row.id}`, undefined, true);
  if (!order) return null;
  if (order.order_id !== row.id || Number(order.order_amount) !== row.amount || order.order_currency !== "INR") {
    throw new Error("Payment order details do not match the jersey request.");
  }
  if (order.order_status === "PAID" && row.payment_status !== "paid") {
    const { error } = await supabaseAdmin.from("qc100_jersey_requests")
      .update({ payment_status: "paid", paid_at: new Date().toISOString() })
      .eq("id", row.id).eq("payment_status", "pending");
    if (error) throw new Error(`Could not confirm payment: ${error.message}`);
  }
  return order;
}

export const jerseyLinkId = (id: string) => `jersey_${id}`;

export async function jerseyPaymentLink(row: JerseyRequest) {
  if (row.payment_status === "paid") return { status: "paid" as const, amount: row.amount };
  if (row.payment_status !== "pending" || row.payment_provider !== "cashfree_link" || row.amount <= 0) {
    throw new Error("This request is not eligible for a payment link. Contact the organizers.");
  }
  const linkId = jerseyLinkId(row.id);
  const link = await requestCashfree<CashfreeLink>(`/links/${linkId}`, undefined, true);
  if (!link) return { status: "pending" as const, amount: row.amount };
  if (!validCashfreeLink(link, linkId, row.amount)) {
    throw new Error("Payment link details do not match the jersey request. Contact the organizers.");
  }
  const orders = await requestCashfree<CashfreeOrder[]>(`/links/${linkId}/orders`);
  if (!Array.isArray(orders)) throw new Error("Could not verify payment status. Please try again.");
  const paid = hasPaidCashfreeOrder(orders, row.amount);
  if (paid) {
    const { error } = await supabaseAdmin.from("qc100_jersey_requests")
      .update({ payment_status: "paid", paid_at: new Date().toISOString() })
      .eq("id", row.id).eq("payment_status", "pending").eq("payment_provider", "cashfree_link");
    if (error) throw new Error(`Could not confirm payment: ${error.message}`);
    return { status: "paid" as const, amount: row.amount };
  }
  if (link.link_status !== "ACTIVE") {
    return { status: "pending" as const, amount: row.amount, message: link.link_status === "PAID"
      ? "Payment verification is pending. Please check again shortly."
      : "This payment link is no longer active. Contact the organizers before paying again." };
  }
  const url = new URL(link.link_url);
  if (url.protocol !== "https:" || !(url.hostname === "cashfree.com" || url.hostname.endsWith(".cashfree.com"))) {
    throw new Error("The payment provider returned an invalid link.");
  }
  return { status: "pending" as const, amount: row.amount, paymentUrl: url.href };
}
