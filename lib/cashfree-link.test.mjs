import assert from "node:assert/strict";
import test from "node:test";
import { hasPaidCashfreeOrder, validCashfreeLink } from "./cashfree-link.ts";

test("payment link must match the request and forbid partial payments", () => {
  const link = { link_id: "jersey_123", link_amount: 150, link_currency: "INR", link_partial_payments: false };
  assert.equal(validCashfreeLink(link, "jersey_123", 150), true);
  assert.equal(validCashfreeLink(link, "jersey_other", 150), false);
  assert.equal(validCashfreeLink(link, "jersey_123", 650), false);
  assert.equal(validCashfreeLink({ ...link, link_currency: "USD" }, "jersey_123", 150), false);
  assert.equal(validCashfreeLink({ ...link, link_partial_payments: true }, "jersey_123", 150), false);
});

test("only a fully paid order with the matching amount and currency confirms a request", () => {
  const order = { order_status: "PAID", order_amount: 150, order_currency: "INR" };
  assert.equal(hasPaidCashfreeOrder([order], 150), true);
  assert.equal(hasPaidCashfreeOrder([], 150), false);
  assert.equal(hasPaidCashfreeOrder([{ ...order, order_status: "ACTIVE" }], 150), false);
  assert.equal(hasPaidCashfreeOrder([{ ...order, order_amount: 100 }], 150), false);
  assert.equal(hasPaidCashfreeOrder([{ ...order, order_currency: "USD" }], 150), false);
});
