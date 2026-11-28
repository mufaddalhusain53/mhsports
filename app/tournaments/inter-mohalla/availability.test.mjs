import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadLayout(enabled) {
  const code = ts.transpileModule(readFileSync(new URL("./layout.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function("require", "exports", code)((name) => {
    if (name === "next/navigation") return { notFound: () => { throw new Error("NOT_FOUND"); } };
    if (name === "@/lib/tournament-features") return { INTER_MOHALLA_ENABLED: enabled };
    throw new Error(`Unexpected dependency: ${name}`);
  }, exports);
  return exports.default;
}

test("Mohalla public routes are unavailable until re-enabled", () => {
  assert.throws(() => loadLayout(false)({ children: "page" }), /NOT_FOUND/);
  assert.equal(loadLayout(true)({ children: "page" }), "page");
});
