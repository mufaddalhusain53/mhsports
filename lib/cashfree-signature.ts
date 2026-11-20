import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyCashfreeSignature(body: string, timestamp: string, signature: string, secret: string): boolean {
  if (!timestamp || !signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(timestamp + body).digest();
  const received = Buffer.from(signature, "base64");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
