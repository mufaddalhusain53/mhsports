import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function createRoute(path, role) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const calls = [];
  const dependencies = {
    "next/server": { NextResponse: Response },
    "@/lib/admin/auth": {
      getAdminRole: async () => role,
      isAdminAuthenticated: async () => role === "super",
    },
    "@/lib/jersey-options": { validJerseyId: () => true },
    "@/lib/supabase/admin": {
      supabaseAdmin: {
        from(table) {
          calls.push(table);
          return {
            select() { return this; },
            eq() { return this; },
            async single() { return { data: { enabled: true }, error: null }; },
            async order() { return { data: [], error: null }; },
          };
        },
      },
    },
  };
  const exports = {};
  new Function("require", "exports", compiled)((name) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, exports);
  return { ...exports, calls };
}

for (const path of ["./quadclash100-registration/route.ts", "./quadclash100-jersey/route.ts"]) {
  test(`${path}: view-only can read but cannot change or delete`, async () => {
    const route = createRoute(path, "viewer");
    const read = await route.GET();
    assert.equal(read.status, 200);
    const callsAfterRead = route.calls.length;
    for (const method of ["PATCH", "DELETE"]) {
      const request = new Request("http://localhost", { method, body: "{}" });
      assert.equal((await route[method](request)).status, 401);
    }
    assert.equal(route.calls.length, callsAfterRead);
  });

  test(`${path}: unauthenticated users cannot read registrations`, async () => {
    const route = createRoute(path, null);
    assert.equal((await route.GET()).status, 401);
    assert.equal(route.calls.length, 0);
  });
}
