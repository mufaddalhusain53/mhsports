import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const code = ts.transpileModule(readFileSync(new URL("./[tournament]/overlay/overlay.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function renderOverlay(teamCount, leadingTeamId = null, player = null) {
  const teams = Array.from({ length: teamCount }, (_, index) => ({
    id: `team-${index}`, name: `Team ${index}`, logo_url: null, points_remaining: 100 - index, player_count: index,
  }));
  const data = {
    tournament: { id: "test", slug: "test", name: "Test", status: "live", current_bid_team_id: leadingTeamId, current_bid: 100, base_price: 0 },
    teams, player, categories: [],
  };
  let stateIndex = 0;
  const react = {
    ...React,
    useState(initial) { return [stateIndex++ === 0 ? data : initial, () => {}]; },
    useEffect: () => {},
    useCallback: (callback) => callback,
    useRef: (value) => ({ current: value }),
  };
  const exports = {};
  new Function("require", "exports", code)((name) => {
    if (name === "react") return react;
    if (name === "@/lib/auction/pricing") return { getAuctionBasePrice: () => 0 };
    if (name === "@/lib/supabase/client") return { supabase: {} };
    if (name === "@/app/auction/TeamMark") return { __esModule: true, default: ({ name }) => React.createElement("span", { "aria-label": `${name} logo` }) };
    if (name.startsWith("@/app/")) return { __esModule: true, default: () => null };
    return require(name);
  }, exports);
  return renderToStaticMarkup(exports.default({ slug: "test" }));
}

test("overlay scrolls every team and shows the leading team beside the bid", () => {
  const html = renderOverlay(8, "team-0");
  assert.match(html, /youtube-overlay-leading-team/);
  assert.match(html, /class="youtube-overlay-bid-team" aria-label="Leading team: Team 0"><span aria-label="Team 0 logo"><\/span><\/div>/);
  for (let index = 0; index < 8; index++) assert.equal((html.match(new RegExp(`>Team ${index}</strong>`, "g")) ?? []).length, 2);
  assert.match(html, /role="region" aria-label="Team balances" tabindex="0"/);
  assert.match(html, /sponsor-strip-duplicate"[^>]*aria-hidden="true"/);
});

test("overlay scrolls without a leading team and keeps small team lists stationary", () => {
  const moving = renderOverlay(5);
  assert.match(moving, /sponsor-strip-track/);
  assert.doesNotMatch(moving, /youtube-overlay-bid-team/);
  for (let index = 0; index < 5; index++) assert.equal((moving.match(new RegExp(`>Team ${index}</strong>`, "g")) ?? []).length, 2);
  const stationary = renderOverlay(4, "team-0");
  assert.doesNotMatch(stationary, /sponsor-strip-track/);
  assert.equal((stationary.match(/>Team \d<\/strong>/g) ?? []).length, 4);
  assert.doesNotMatch(renderOverlay(5, "deleted-team"), /youtube-overlay-bid-team/);
});

test("overlay shows the winning team for a sold player, but no team for an unsold player", () => {
  const player = { status: "sold", sold_team_id: "team-2", sold_price: 150, rtm_team_id: null };
  const sold = renderOverlay(5, null, player);
  assert.match(sold, /aria-label="Winning team: Team 2"/);
  assert.match(sold, />SOLD</);
  assert.doesNotMatch(renderOverlay(5, "team-2", { ...player, status: "unsold" }), /youtube-overlay-bid-team/);
});
