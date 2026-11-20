import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyCashfreeSignature } from "./cashfree-signature.ts";

test("Cashfree signature verification uses the exact timestamp and raw body", () => {
  const secret = "test-secret";
  const timestamp = "1600000000000";
  const body = '{"type":"PAYMENT_SUCCESS_WEBHOOK"}';
  const signature = createHmac("sha256", secret).update(timestamp + body).digest("base64");
  assert.equal(verifyCashfreeSignature(body, timestamp, signature, secret), true);
  assert.equal(verifyCashfreeSignature(`${body} `, timestamp, signature, secret), false);
  assert.equal(verifyCashfreeSignature(body, `${timestamp}1`, signature, secret), false);
  assert.equal(verifyCashfreeSignature(body, timestamp, "invalid", secret), false);
});
