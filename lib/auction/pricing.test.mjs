import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./pricing.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
new Function("exports", compiled)(exports);

test("opening price uses the player's category, including a zero base price", () => {
  const categories = [{ id: "a", base_price: 5000 }, { id: "b", base_price: 0 }];
  assert.equal(exports.getAuctionBasePrice({ category_id: "a" }, categories, 2000), 5000);
  assert.equal(exports.getAuctionBasePrice({ category_id: "b" }, categories, 2000), 0);
});

test("opening price falls back to the tournament when the category is unavailable", () => {
  const categories = [{ id: "a", base_price: 5000 }];
  assert.equal(exports.getAuctionBasePrice({ category_id: "missing" }, categories, 2000), 2000);
  assert.equal(exports.getAuctionBasePrice({ category_id: null }, categories, 2000), 2000);
  assert.equal(exports.getAuctionBasePrice(null, categories, 2000), 2000);
});

test("category updates change the opening price and new categories are retained", () => {
  const player = { category_id: "a" };
  const original = [{ id: "a", base_price: 5000 }];
  const updated = exports.upsertAuctionCategory(original, { id: "a", base_price: 6000 });
  assert.equal(exports.getAuctionBasePrice(player, updated, 2000), 6000);
  assert.equal(exports.getAuctionBasePrice({ category_id: "b" }, exports.upsertAuctionCategory(updated, { id: "b", base_price: 3000 }), 2000), 3000);
  assert.equal(original[0].base_price, 5000);
});
