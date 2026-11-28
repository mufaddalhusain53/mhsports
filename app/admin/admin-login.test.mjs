import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import ts from "typescript";

const require = createRequire(import.meta.url);
const code = ts.transpileModule(readFileSync(new URL("./admin-login.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function loginForm(auction, location) {
  const exports = {};
  const react = { ...React, useState: (initial) => [initial, () => {}] };
  new Function("require", "exports", "window", "fetch", code)(
    (name) => name === "react" ? react : require(name),
    exports,
    { location },
    async () => ({ ok: true, json: async () => ({}) }),
  );
  const findForm = (element) => {
    if (!React.isValidElement(element)) return undefined;
    if (element.type === "form") return element;
    return React.Children.toArray(element.props.children).map(findForm).find(Boolean);
  };
  return findForm(exports.default({ auction }));
}

test("successful auction login reloads the requested page instead of leaving the domain", async () => {
  let reloads = 0;
  const location = { href: "/admin/auctions/test/run?tab=players", reload: () => { reloads++; } };
  await loginForm(true, location).props.onSubmit({ preventDefault() {} });
  assert.equal(reloads, 1);
  assert.equal(location.href, "/admin/auctions/test/run?tab=players");
});

test("successful non-auction login continues to the admin dashboard", async () => {
  const location = { href: "/admin/quadclash100/jersey", reload: () => assert.fail("unexpected reload") };
  await loginForm(false, location).props.onSubmit({ preventDefault() {} });
  assert.equal(location.href, "/admin");
});

test("auction admin pages distinguish view-only sessions from signed-out users", async () => {
  for (const path of ["./auctions/page.tsx", "./auctions/[slug]/page.tsx", "./auctions/[slug]/run/page.tsx"]) {
    const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    for (const role of [null, "viewer"]) {
      const exports = {};
      new Function("require", "exports", compiled)((name) => {
        if (name === "@/lib/admin/auth") return { getAdminRole: async () => role };
        if (name.endsWith("admin-login")) return { __esModule: true, default: () => null };
        if (name.endsWith("admin-auctions") || name.endsWith("auction-admin-panel")) return { __esModule: true, default: () => null };
        return require(name);
      }, exports);
      const page = await exports.default({ params: Promise.resolve({ slug: "test" }) });
      assert.equal(page.props.auction, true);
      assert.equal(page.props.restricted, role === "viewer");
    }
  }
});
