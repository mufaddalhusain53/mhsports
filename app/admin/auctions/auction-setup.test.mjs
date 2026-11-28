import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const code = ts.transpileModule(readFileSync(new URL("./[slug]/auction-admin-panel.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function renderSetup(status, tab = "players", options = {}) {
  const data = {
    tournament: { id: "test", slug: "test", name: "Test", status, base_price: 0, bid_increment: 100, current_bid: null, min_squad_size: 1, rtm_enabled: options.rtmEnabled, current_player_id: options.player?.id, ...options.tournament },
    teams: options.teams ?? [], players: options.player ? [options.player] : [], categories: [], sponsors: [],
  };
  let stateIndex = 0;
  const state = [];
  const react = {
    ...React,
    useState(initial) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = index === 0 ? data : initial === "overview" ? tab : typeof initial === "function" ? initial() : initial;
      return [state[index], (next) => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
    },
    useEffect: () => {},
    useMemo: (callback) => callback(),
    useCallback: (callback) => callback,
    useRef: (value) => ({ current: value }),
    useSyncExternalStore: (_subscribe, _snapshot, serverSnapshot) => serverSnapshot(),
  };
  const exports = {};
  new Function("require", "exports", code)((name) => {
    if (name === "react") return react;
    if (name === "@/lib/auction/projector-fields") return require("../../../lib/auction/projector-fields.ts");
    if (name === "@/lib/auction/domains") return require("../../../lib/auction/domains.ts");
    if (name === "@/lib/auction/pricing") return { getAuctionBasePrice: () => 0 };
    if (name === "@/lib/auction/sponsors") return { sortSponsors: (sponsors) => sponsors };
    if (name === "@/lib/supabase/client") return { supabase: {} };
    if (name.startsWith("@/app/")) return { __esModule: true, default: () => null };
    return require(name);
  }, exports);
  const render = () => {
    stateIndex = 0;
    return exports.default({ slug: "test", view: options.view ?? "setup" });
  };
  if (options.collapseCheck) {
    const findToggle = (element) => {
      if (!React.isValidElement(element)) return undefined;
      if (element.props["aria-controls"] === "player-pool-content") return element;
      return React.Children.toArray(element.props.children).map(findToggle).find(Boolean);
    };
    const expanded = render();
    findToggle(expanded).props.onClick();
    const collapsed = render();
    findToggle(collapsed).props.onClick();
    return [expanded, collapsed, render()].map((element) => renderToStaticMarkup(element));
  }
  return renderToStaticMarkup(render());
}

for (const status of ["setup", "live"]) {
  test(`players tab shows the template and ${status === "setup" ? "enables" : "locks"} upload in ${status}`, () => {
    const html = renderSetup(status);
    const container = html.match(/<div class="([^"]*)"><section class="[^"]*"><h2 class="[^"]*">Player pool<\/h2>/);
    assert.ok(container, "Player pool section is rendered");
    assert.doesNotMatch(container[1], /\bhidden\b/);
    assert.match(html, /Download Excel template/);
    const upload = html.match(/Upload player list \(Excel\)<input ([^>]*)/);
    assert.ok(upload, "Player upload input is rendered");
    assert.equal(/\bdisabled\b/.test(upload[1]), status !== "setup");
  });
}

test("auction header omits the public URL while retaining viewer and sharing controls", () => {
  for (const view of ["setup", "run"]) {
    const html = renderSetup("live", "overview", { view });
    assert.doesNotMatch(html, /Public page:/);
    assert.match(html, /href="[^"]*\/auction\/test"[^>]*>Viewer ↗<\/a>/);
    assert.match(html, /aria-label="Copy viewer URL"/);
  }
});

test("overview offers the viewer squad view setting", () => {
  const html = renderSetup("setup", "overview");
  assert.match(html, /Viewer squad view/);
  assert.match(html, /<option value="cards" selected="">Cards<\/option>/);
  assert.match(html, /<option value="field">Field view<\/option>/);
  assert.match(html, /Save squad view/);
});

test("overview includes a category visibility checkbox", () => {
  const html = renderSetup("setup", "overview");
  assert.match(html, /<input type="checkbox"[^>]*checked=""\/>Category/);
});

test("the sold-player RTM action is shown only when RTM is enabled", () => {
  const player = { id: "player", full_name: "Test Player", player_number: 1, category: "A", status: "sold", sold_team_id: "team", sold_price: 100, photo_url: null };
  for (const rtmEnabled of [false, true]) {
    const html = renderSetup("live", "overview", { view: "run", player, rtmEnabled });
    assert.equal(html.includes(">RTM</button>"), rtmEnabled);
    assert.match(html, />Re-Auction<\/button>/);
    assert.match(html, /Next Player/);
  }
});

test("live player and bid summary keeps bid controls and sold safeguards", () => {
  const player = { id: "player", full_name: "Test Player", player_number: 1, category: "A", status: "available", photo_url: null };
  const team = { id: "team", name: "Team One", points_remaining: 5000, rtm_count: 0 };
  const opening = renderSetup("live", "overview", { view: "run", player, teams: [team] });
  assert.match(opening, /aria-label="Current player and bid"[^>]*>.*Test Player.*Opening price.*Bid increment/);
  assert.match(opening, /aria-label="Bid amount"/);
  assert.match(opening, /aria-label="Decrease bid"[^>]*disabled=""/);
  assert.match(opening, /disabled=""[^>]*>✓ Sold<\/button>/);
  const bidding = renderSetup("live", "overview", { view: "run", player, teams: [team], tournament: { current_bid_team_id: "team", current_bid: 1000 } });
  assert.match(bidding, /aria-label="Current player and bid"[^>]*>.*Test Player.*Highest bid · Team One.*1000.*Bid increment/);
  assert.match(bidding, /aria-label="Bid amount"[^>]*value="1100"/);
  assert.doesNotMatch(bidding, /disabled=""[^>]*>✓ Sold<\/button>/);
});

test("queue keeps both filters together and its actions below them", () => {
  const html = renderSetup("live", "overview", { view: "run" });
  assert.match(html, /class="mt-2 grid grid-cols-2[^"]*">.*class="sr-only">Selection method.*Category filter/);
  assert.match(html, /Category filter.*>Applied<\/button>.*>Re-auction unsold .*No available players/);
  assert.doesNotMatch(html, /Choose who goes on the block|A random available player is selected|Selects the lowest-numbered available player/);
});

test("only the current highest-bidding team is highlighted, even when it cannot bid again", () => {
  const player = { id: "player", full_name: "Test Player", player_number: 1, category: "A", status: "available", photo_url: null };
  const teams = [
    { id: "team-1", name: "Team One", points_remaining: 1000, rtm_count: 0 },
    { id: "team-2", name: "Team Two", points_remaining: 5000, rtm_count: 0 },
  ];
  const render = (current_bid_team_id) => renderSetup("live", "overview", { view: "run", player, teams, tournament: { current_bid_team_id, current_bid: 1000 } });
  const html = render("team-1");
  assert.match(html, /<button[^>]*disabled=""[^>]*border-emerald-400\/80[^>]*>.*?Team One<\/span><span[^>]*>Highest bid<\/span>/);
  assert.equal((html.match(/>Highest bid<\/span>/g) ?? []).length, 1);
  for (const id of [null, "unknown"]) assert.doesNotMatch(render(id), />Highest bid<\/span>/);
});

test("player pool starts collapsed and can be opened and closed", () => {
  const [collapsed, expanded, closedAgain] = renderSetup("live", "overview", { view: "run", collapseCheck: true });
  assert.match(collapsed, /aria-expanded="false" aria-controls="player-pool-content"[^>]*>Show player pool/);
  assert.match(collapsed, /<div id="player-pool-content" hidden="">/);
  assert.match(expanded, /aria-expanded="true" aria-controls="player-pool-content"[^>]*>Hide player pool/);
  assert.match(expanded, /<div id="player-pool-content"><div[^>]*>.*Search by Name/);
  assert.match(closedAgain, /aria-expanded="false" aria-controls="player-pool-content"/);
  assert.match(closedAgain, /<div id="player-pool-content" hidden="">/);
});
