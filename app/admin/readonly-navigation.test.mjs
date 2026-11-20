import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadPage(path, role) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  const Dashboard = (props) => React.createElement("div", null, `dashboard:${props.view}:${props.readOnly}`);
  const Login = () => React.createElement("div", null, "login");
  new Function("require", "exports", compiled)((name) => {
    if (name === "react/jsx-runtime") return require(name);
    if (name === "next/link") return { __esModule: true, default: "a" };
    if (name === "../../lib/admin/auth") return { getAdminRole: async () => role };
    if (name === "../../lib/supabase/admin") return {
      supabaseAdmin: {
        from: (table) => {
          assert.equal(table, "mohalla_survey_responses");
          return { select: () => ({ order: async () => ({ data: [], error: null }) }) };
        },
      },
    };
    if (name === "./admin-dashboard") return { __esModule: true, default: Dashboard };
    if (name === "./admin-login") return { __esModule: true, default: Login };
    if (name === "./admin-logout-button") return { __esModule: true, default: () => null };
    throw new Error(`Unexpected dependency: ${name}`);
  }, exports);
  return exports.default;
}

test("view-only navigation exposes registration sections but not privileged sections", async () => {
  const page = loadPage("./page.tsx", "viewer");
  const html = renderToStaticMarkup(await page());
  assert.match(html, /Player Registration Management/);
  assert.match(html, /Jersey Form Management/);
  assert.match(html, /Player Survey Management/);
  assert.doesNotMatch(html, /Leaderboard Update|Auction Hosting/);
});

test("direct privileged page access is denied while registration pages are available", async () => {
  const page = loadPage("./admin-section-page.tsx", "viewer");
  for (const view of ["friendshipcup-leaderboard", "quadclash100-leaderboard"]) {
    assert.match(renderToStaticMarkup(await page({ view })), /Access restricted/);
  }
  for (const view of ["quadclash100-registration", "quadclash100-jersey", "mohalla-survey"]) {
    assert.match(renderToStaticMarkup(await page({ view })), new RegExp(`dashboard:${view}:true`));
  }
});
