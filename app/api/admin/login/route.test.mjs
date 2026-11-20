import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function createHandler({ allowed = true, dbError = null, viewerConfigured = true, pinsMatch = false } = {}) {
  const sessions = [];
  const attempts = [];
  const dependencies = {
    "next/server": { NextResponse: Response },
    "../../../../lib/admin/auth": {
      createAdminSession: async (role) => sessions.push(role),
      verifyAdminPin: (pin) => pin === "super-test",
      verifyViewerPin: (pin) => {
        if (pinsMatch) throw new Error("PINs must differ");
        return pin === "viewer-test";
      },
    },
    "@/lib/supabase/admin": {
      supabaseAdmin: {
        rpc: async (name) => { attempts.push(name); return { data: allowed, error: dbError }; },
      },
    },
  };
  const exports = {};
  new Function("require", "exports", "console", "process", compiled)(
    (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    exports,
    { error: () => {} },
    { env: { ADMIN_VIEWER_PIN: viewerConfigured ? "viewer-test" : "" } },
  );
  return { POST: exports.POST, sessions, attempts };
}

function request(body) {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

test("the PIN determines the role, ignoring any role supplied by the caller", async () => {
  const handler = createHandler();
  assert.equal((await handler.POST(request('{"pin":"viewer-test","role":"super"}'))).status, 200);
  assert.equal((await handler.POST(request('{"pin":"super-test","role":"viewer"}'))).status, 200);
  assert.deepEqual(handler.sessions, ["viewer", "super"]);
  assert.deepEqual(handler.attempts, ["consume_admin_viewer_login_attempt"]);
});

test("viewer login fails closed on rate limit or database error", async () => {
  for (const [options, expected] of [[{ allowed: false }, 429], [{ dbError: "unavailable" }, 503]]) {
    const handler = createHandler(options);
    assert.equal((await handler.POST(request('{"pin":"viewer-test"}'))).status, expected);
    assert.deepEqual(handler.sessions, []);
  }
});

test("viewer attempts are counted even when the PIN is incorrect", async () => {
  const handler = createHandler();
  assert.equal((await handler.POST(request('{"pin":"wrong"}'))).status, 401);
  assert.equal(handler.attempts.length, 1);
  assert.deepEqual(handler.sessions, []);
});

test("super login remains available when the viewer limiter is locked or unconfigured", async () => {
  for (const options of [{ allowed: false }, { dbError: "unavailable" }, { viewerConfigured: false }]) {
    const handler = createHandler(options);
    assert.equal((await handler.POST(request('{"pin":"super-test"}'))).status, 200);
    assert.deepEqual(handler.sessions, ["super"]);
    assert.deepEqual(handler.attempts, []);
  }
});

test("matching PIN configuration cannot issue a super session", async () => {
  const handler = createHandler({ pinsMatch: true });
  assert.equal((await handler.POST(request('{"pin":"super-test"}'))).status, 500);
  assert.deepEqual(handler.sessions, []);
});
