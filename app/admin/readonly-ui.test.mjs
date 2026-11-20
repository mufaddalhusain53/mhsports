import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);

function renderComponent(path, states, readOnly) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const stateValues = [...states];
  const react = { ...React, useEffect: () => {}, useState: () => [stateValues.shift(), () => {}] };
  const exports = {};
  new Function("require", "exports", code)((name) => {
    if (name === "react") return react;
    if (name === "@/lib/jersey-options") return require("../../lib/jersey-options.ts");
    return require(name);
  }, exports);
  return renderToStaticMarkup(exports.default({ readOnly }));
}

test("admin login asks for a PIN without an access-level selector", () => {
  const html = renderComponent("./admin-login.tsx", ["", false, ""], true);
  assert.match(html, /Admin PIN/);
  assert.doesNotMatch(html, /Access level|<select/);
});

test("view-only player list keeps details and export but hides changes", () => {
  const player = {
    id: 1, first_name: "Test", last_name: "Player", phone_number: "000",
    age: 20, its_id: "00000000", season1_team: "Strikers", role: "Bowler",
    batting_style: "RH Top Order", bowling_style: "Off Spin", photo_url: "https://example.test/photo",
    auction_available: true, created_at: "2026-01-01",
  };
  const state = [true, [player], "", false, false, null, null, ""];
  const viewer = renderComponent("./quadclash-registration-admin.tsx", state, true);
  const admin = renderComponent("./quadclash-registration-admin.tsx", state, false);
  assert.match(viewer, /Test Player/);
  assert.match(viewer, /View photo/);
  assert.match(viewer, /Download Excel/);
  assert.doesNotMatch(viewer, /Disable Registration|Mark Inactive|Delete registration for/);
  assert.match(admin, /Disable Registration/);
  assert.match(admin, /Mark Inactive/);
  assert.match(admin, /Delete registration for Test Player/);
});

test("view-only jersey list keeps details and export but hides changes", () => {
  const row = {
    id: "test-id", player_name: "Test Player", jersey_name: "Test",
    phone_number: null, team: "Strikers", jersey_size: "40", jersey_option: "1 Full",
    amount: 150, payment_status: "pending", payment_provider: "manual_qr",
    created_at: "2026-01-01",
  };
  const state = [[row], "", true, false, null, null, false];
  const viewer = renderComponent("./quadclash-jersey-admin.tsx", state, true);
  const admin = renderComponent("./quadclash-jersey-admin.tsx", state, false);
  assert.match(viewer, /Test Player/);
  assert.match(viewer, /Payment pending/);
  assert.match(viewer, /Export Excel/);
  assert.doesNotMatch(viewer, /Disable Jersey Form|Mark paid|>Delete</);
  assert.match(admin, /Disable Jersey Form/);
  assert.match(admin, /Mark paid/);
  assert.match(admin, />Delete</);
});
