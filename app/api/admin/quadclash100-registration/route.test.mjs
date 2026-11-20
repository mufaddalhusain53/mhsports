import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function createHandler({
  authenticated = true,
  player = { photo_path: "player.jpg" },
  lookupError = null,
  photoError = null,
  deleteErrors = [],
  deleted = { id: 7 },
} = {}) {
  const calls = [];
  let photoRemoved = false;
  const dependencies = {
    "next/server": { NextResponse: Response },
    "@/lib/admin/auth": { isAdminAuthenticated: async () => authenticated },
    "@/lib/supabase/admin": {
      supabaseAdmin: {
        from(table) {
          let operation = "lookup";
          return {
            delete() { operation = "delete"; return this; },
            eq(column, value) { calls.push([operation, table, column, value]); return this; },
            select() { return this; },
            async maybeSingle() {
              return operation === "lookup"
                ? { data: player, error: lookupError }
                : { data: deleted, error: deleteErrors.shift() ?? null };
            },
          };
        },
        storage: {
          from(bucket) {
            return {
              async remove(paths) {
                calls.push(["remove", bucket, paths]);
                if (photoError) return { data: null, error: photoError };
                const data = photoRemoved ? [] : [{ name: paths[0] }];
                photoRemoved = true;
                return { data, error: null };
              },
            };
          },
        },
      },
    },
  };
  const exports = {};
  const logs = [];
  new Function("require", "exports", "console", compiled)(
    (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    exports,
    { error: (...args) => logs.push(args) },
  );
  return { DELETE: exports.DELETE, calls, logs };
}

function request(body) {
  return new Request("http://localhost/api/admin/quadclash100-registration", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

test("delete requires an authenticated admin", async () => {
  const handler = createHandler({ authenticated: false });
  const response = await handler.DELETE(request('{"playerId":7}'));
  assert.equal(response.status, 401);
  assert.deepEqual(handler.calls, []);
});

test("delete rejects malformed JSON and invalid player IDs", async () => {
  const handler = createHandler();
  for (const body of ["{", "null", "{}", '{"playerId":"7"}', '{"playerId":0}', '{"playerId":1.5}', '{"playerId":9007199254740992}']) {
    const response = await handler.DELETE(request(body));
    assert.equal(response.status, 400, body);
  }
  assert.deepEqual(handler.calls, []);
});

test("delete removes the stored photo before the requested registration", async () => {
  const handler = createHandler();
  const response = await handler.DELETE(request('{"playerId":7}'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.deepEqual(handler.calls, [
    ["lookup", "qc100_player_registrations", "id", 7],
    ["remove", "qc100-player-photos", ["player.jpg"]],
    ["delete", "qc100_player_registrations", "id", 7],
  ]);
});

test("missing registration, invalid photo path and lookup errors do not delete anything", async () => {
  const missing = createHandler({ player: null });
  assert.equal((await missing.DELETE(request('{"playerId":7}'))).status, 404);
  const invalid = createHandler({ player: { photo_path: "" } });
  assert.equal((await invalid.DELETE(request('{"playerId":7}'))).status, 500);
  const failed = createHandler({ lookupError: { message: "lookup error" } });
  assert.equal((await failed.DELETE(request('{"playerId":7}'))).status, 500);
  for (const handler of [missing, invalid, failed]) {
    assert.equal(handler.calls.some(([operation]) => operation === "remove" || operation === "delete"), false);
  }
});

test("photo deletion failure leaves the registration intact", async () => {
  const handler = createHandler({ photoError: { message: "storage error" } });
  const response = await handler.DELETE(request('{"playerId":7}'));
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /registration was not deleted/);
  assert.equal(handler.calls.some(([operation]) => operation === "delete"), false);
  assert.equal(handler.logs.length, 1);
});

test("database failure after photo removal is reported and deletion can be retried", async () => {
  const handler = createHandler({ deleteErrors: [{ message: "database error" }] });
  const failed = await handler.DELETE(request('{"playerId":7}'));
  assert.equal(failed.status, 500);
  assert.match((await failed.json()).error, /photo was deleted.*Please try again/);
  assert.equal(handler.logs.length, 1);
  const retry = await handler.DELETE(request('{"playerId":7}'));
  assert.equal(retry.status, 200);
  assert.deepEqual(await retry.json(), { success: true });
});
