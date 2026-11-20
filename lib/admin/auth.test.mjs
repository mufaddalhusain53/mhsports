import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("./auth.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function createAuth({ superPin = "super-test", viewerPin = "viewer-test" } = {}) {
  let token;
  const store = {
    get: () => token ? { value: token } : undefined,
    set: (_name, value) => { token = value; },
  };
  const dependencies = {
    jose: require("jose"),
    "node:crypto": require("node:crypto"),
    "next/headers": { cookies: async () => store },
  };
  const exports = {};
  new Function("require", "exports", "process", compiled)(
    (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    exports,
    { env: { ADMIN_PIN: superPin, ADMIN_VIEWER_PIN: viewerPin, ADMIN_SESSION_SECRET: "test-secret", NODE_ENV: "test" } },
  );
  return { ...exports, setToken: (value) => { token = value; } };
}

test("viewer and super sessions have distinct permissions", async () => {
  const auth = createAuth();
  await auth.createAdminSession("viewer");
  assert.equal(await auth.getAdminRole(), "viewer");
  assert.equal(await auth.isAdminAuthenticated(), false);
  await auth.createAdminSession("super");
  assert.equal(await auth.getAdminRole(), "super");
  assert.equal(await auth.isAdminAuthenticated(), true);
  await auth.destroyAdminSession();
  assert.equal(await auth.getAdminRole(), null);
});

test("legacy super sessions remain valid and invalid roles or signatures are denied", async () => {
  const auth = createAuth();
  const { SignJWT } = require("jose");
  const key = new TextEncoder().encode("test-secret");
  async function sign(payload, secret = key) {
    return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(secret);
  }
  auth.setToken(await sign({ admin: true }));
  assert.equal(await auth.getAdminRole(), "super");
  auth.setToken(await sign({ admin: true, role: "unknown" }));
  assert.equal(await auth.getAdminRole(), null);
  auth.setToken(await sign({ admin: true, role: "super" }, new TextEncoder().encode("wrong-key")));
  assert.equal(await auth.getAdminRole(), null);
  auth.setToken(await sign({ admin: false, role: "viewer" }));
  assert.equal(await auth.getAdminRole(), null);
});

test("PINs are separate and identical configuration is rejected", () => {
  const auth = createAuth();
  assert.equal(auth.verifyAdminPin("super-test"), true);
  assert.equal(auth.verifyAdminPin("viewer-test"), false);
  assert.equal(auth.verifyViewerPin("viewer-test"), true);
  assert.equal(auth.verifyViewerPin("super-test"), false);
  assert.throws(() => createAuth({ superPin: "same", viewerPin: "same" }).verifyViewerPin("same"), /must differ/);
});
