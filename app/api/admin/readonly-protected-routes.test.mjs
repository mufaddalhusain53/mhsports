import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const routes = [
  ["../points-table/refresh/route.ts", ["POST"]],
  ["../points-table/pdf/route.ts", ["GET", "POST"]],
  ["../fc-season-stats/route.ts", ["POST"]],
  ["../fc-season-stats/bulk/route.ts", ["POST"]],
  ["../quadclash100-stats/route.ts", ["POST"]],
  ["./friendship-cup/gallery/route.ts", ["POST"]],
  ["./auctions/route.ts", ["GET", "POST"]],
  ["./auctions/[slug]/route.ts", ["GET", "PATCH"]],
  ["./auctions/[slug]/assets/route.ts", ["POST"]],
  ["./auctions/[slug]/players/route.ts", ["POST", "PATCH", "DELETE"]],
];

test("view-only sessions cannot call privileged points, stats, gallery or auction routes", async () => {
  for (const [path, methods] of routes) {
    const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    const exports = {};
    new Function("require", "exports", compiled)((name) => {
      if (name === "next/server") return { NextResponse: Response };
      if (name === "@/lib/admin/auth") return { isAdminAuthenticated: async () => false };
      if (name === "@/lib/supabase/admin") return {
        supabaseAdmin: { from: () => { throw new Error("Unauthorized database access"); } },
      };
      return {};
    }, exports);
    for (const method of methods) {
      const request = new Request("http://localhost", { method, ...(method === "GET" ? {} : { body: "{}" }) });
      const response = await exports[method](request, { params: Promise.resolve({ slug: "test" }) });
      assert.equal(response.status, 401, `${path} ${method}`);
    }
  }
});
