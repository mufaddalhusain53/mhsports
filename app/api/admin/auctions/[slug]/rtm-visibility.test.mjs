import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const fieldsSource = readFileSync(new URL("../../../../../lib/auction/projector-fields.ts", import.meta.url), "utf8");
const fieldsCompiled = ts.transpileModule(fieldsSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const fieldsExports = {};
new Function("exports", fieldsCompiled)(fieldsExports);

function createHandler({ authenticated = true, updateError = null, updated = true } = {}) {
  const updates = [];
  const dependencies = {
    "next/server": { NextResponse: Response },
    "@/lib/admin/auth": { isAdminAuthenticated: async () => authenticated },
    "@/lib/auction/projector-fields": fieldsExports,
    "@/lib/supabase/admin": {
      supabaseAdmin: {
        from: (table) => {
          assert.equal(table, "auction_tournaments");
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "tournament-1" }, error: null }) }) }),
            update: (values) => ({
              eq: (column, id) => {
                updates.push({ values, column, id });
                return { select: () => ({ maybeSingle: async () => ({ data: updated ? { id } : null, error: updateError }) }) };
              },
            }),
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
  return { PATCH: exports.PATCH, updates };
}

function request(enabled) {
  return new Request("http://localhost/api/admin/auctions/test", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "rtm_visibility", enabled }),
  });
}

const context = { params: Promise.resolve({ slug: "test" }) };

test("RTM visibility can be enabled and disabled for the tournament", async () => {
  const handler = createHandler();
  for (const enabled of [false, true]) {
    const response = await handler.PATCH(request(enabled), context);
    assert.equal(response.status, 200);
    const update = handler.updates.at(-1);
    assert.equal(update.values.rtm_enabled, enabled);
    assert.equal(update.column, "id");
    assert.equal(update.id, "tournament-1");
  }
});

test("RTM visibility rejects invalid values and unauthenticated requests", async () => {
  const handler = createHandler();
  assert.equal((await handler.PATCH(request("no"), context)).status, 400);
  assert.equal(handler.updates.length, 0);
  assert.equal((await createHandler({ authenticated: false }).PATCH(request(false), context)).status, 401);
});

test("RTM visibility reports database failures", async () => {
  const response = await createHandler({ updateError: { message: "database unavailable" } }).PATCH(request(false), context);
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /database unavailable/);
  assert.equal((await createHandler({ updated: false }).PATCH(request(false), context)).status, 404);
});

test("projector player fields save a selection or an empty list", async () => {
  const handler = createHandler();
  for (const fields of [["skill", "previous_team"], []]) {
    const response = await handler.PATCH(new Request("http://localhost/api/admin/auctions/test", {
      method: "PATCH",
      body: JSON.stringify({ action: "projector_player_fields", fields }),
    }), context);
    assert.equal(response.status, 200);
    assert.deepEqual(handler.updates.at(-1).values.projector_player_fields, fields);
  }
});

test("projector player fields reject invalid or duplicate selections", async () => {
  const handler = createHandler();
  for (const fields of [["unknown"], ["skill", "skill"], [null], "skill"]) {
    const response = await handler.PATCH(new Request("http://localhost/api/admin/auctions/test", {
      method: "PATCH",
      body: JSON.stringify({ action: "projector_player_fields", fields }),
    }), context);
    assert.equal(response.status, 400);
  }
  assert.equal(handler.updates.length, 0);
});

test("projector player fields report database failures", async () => {
  const makeRequest = () => new Request("http://localhost/api/admin/auctions/test", {
    method: "PATCH",
    body: JSON.stringify({ action: "projector_player_fields", fields: [] }),
  });
  const response = await createHandler({ updateError: { message: "database unavailable" } }).PATCH(makeRequest(), context);
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /database unavailable/);
  assert.equal((await createHandler({ updated: false }).PATCH(makeRequest(), context)).status, 404);
  assert.equal((await createHandler({ authenticated: false }).PATCH(makeRequest(), context)).status, 401);
});
