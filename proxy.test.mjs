import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const domains = {};
new Function("exports", compile("./lib/auction/domains.ts"))(domains);
const exports = {};
new Function("require", "exports", compile("./proxy.ts"))((name) =>
  name === "./lib/auction/domains" ? domains : require(name), exports);

function request(host, path) {
  return new NextRequest(`https://${host}${path}`, { headers: { host } });
}

test("admin public links stay local on loopback and use the auction domain elsewhere", () => {
  assert.equal(domains.getAuctionOrigin("localhost", "http://localhost:3000"), "http://localhost:3000");
  assert.equal(domains.getAuctionOrigin("127.0.0.1", "http://127.0.0.1:3000"), "http://127.0.0.1:3000");
  assert.equal(domains.getAuctionOrigin("[::1]", "http://[::1]:3000"), "http://[::1]:3000");
  assert.equal(domains.getAuctionOrigin("mhsports53.vercel.app", "https://mhsports53.vercel.app"), "https://beyondauctions.vercel.app");
});

test("auction domain opens the auction list and preserves queries", () => {
  const response = exports.proxy(request("beyondauctions.vercel.app", "/?source=test"));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://beyondauctions.vercel.app/auction?source=test");
});

test("auction domain keeps auction routes, APIs and assets available", () => {
  for (const path of ["/auction", "/auction/test/projector", "/api/auctions", "/_next/image", "/quadclash100/logos/test.png"]) {
    assert.equal(exports.proxy(request("beyondauctions.vercel.app", path)).headers.get("x-middleware-next"), "1", path);
  }
});

test("non-auction pages go to the main site, without affecting other domains", () => {
  const response = exports.proxy(request("beyondauctions.vercel.app", "/tournaments/test?source=auction"));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://mhsports53.vercel.app/tournaments/test?source=auction");
  const admin = exports.proxy(request("beyondauctions.vercel.app", "/admin/auctions/test/run?tab=players"));
  assert.equal(admin.status, 307);
  assert.equal(admin.headers.get("location"), "https://mhsports53.vercel.app/admin/auctions/test/run?tab=players");
  assert.equal(exports.proxy(request("mhsports53.vercel.app", "/")).headers.get("x-middleware-next"), "1");
  assert.equal(exports.proxy(request("localhost:3000", "/about")).headers.get("x-middleware-next"), "1");
});
