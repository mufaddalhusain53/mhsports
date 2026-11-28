import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);

function compile(path, resolve) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function("require", "exports", code)(resolve, exports);
  return exports.default;
}

test("points table retains Season 1 standings and announces Season 2", () => {
  const Standings = compile("./PointsTableClient.tsx", (name) => {
    if (name === "next/image") return { __esModule: true, default: "img" };
    return require(name);
  });
  const Page = compile("./page.tsx", (name) => {
    if (name === "next/link") return { __esModule: true, default: "a" };
    if (name === "../../../components/TournamentLogo") return { __esModule: true, default: () => null };
    if (name === "./PointsTableClient") return { __esModule: true, default: Standings };
    return require(name);
  });
  const html = renderToStaticMarkup(React.createElement(Page));
  assert.match(html, /QuadClash 100 Points Table/);
  assert.match(html, /Season 1/);
  assert.match(html, /Season 2 begins on 20 March 2027/);
  assert.match(html, /cricheroes\.com\/tournament\/1987117/);
  for (const team of ["Strikers", "Multiplize Highlanders", "Ezzi United XIII", "Mavericks"]) {
    assert.ok(html.includes(team));
  }
  for (const logo of ["strikers", "multiplize-highlanders", "ezzi-united", "mavericks"]) {
    assert.ok(html.includes(`/quadclash100/logos/${logo}.png`));
  }
  assert.match(html, /0\.194/);
  assert.match(html, /-0\.335/);
});
