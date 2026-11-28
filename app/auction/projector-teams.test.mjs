import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const categoryCode = ts.transpileModule(readFileSync(new URL("../../lib/auction/player-category.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const categoryExports = {};
new Function("exports", categoryCode)(categoryExports);
const code = ts.transpileModule(readFileSync(new URL("./[tournament]/projector/projector.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const cardCode = ts.transpileModule(readFileSync(new URL("./PlayerCard.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const cardExports = {};
new Function("require", "exports", cardCode)((name) => {
  if (name === "@/app/components/AuctionImage") return { __esModule: true, default: () => null };
  if (name === "@/lib/auction/player-category") return categoryExports;
  return require(name);
}, cardExports);
const searchCode = ts.transpileModule(readFileSync(new URL("./PlayerSearch.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const searchExports = {};
new Function("require", "exports", searchCode)(require, searchExports);

function renderProjector(teamCount, selectedTeam = false, options = {}) {
  const teams = Array.from({ length: teamCount }, (_, index) => ({
    id: `team-${index}`, name: `Team ${index}`, slug: `team-${index}`, logo_url: null, points_remaining: 100, rtm_count: 0,
  }));
  const players = options.players ?? (selectedTeam ? Array.from({ length: 7 }, (_, index) => ({
    id: `player-${index}`, player_number: index + 1, full_name: `Player ${index}`, category: "A", category_id: "a",
    status: "sold", sold_team_id: "team-0", sold_price: 10,
  })) : []);
  const data = {
    tournament: { id: "test", slug: "test", status: "setup", points_per_team: 100, base_price: 0, min_squad_size: 0, max_squad_size: 8, organizer_logo_urls: [], projector_player_fields: options.playerFields ?? [], show_player_category: options.showCategory ?? true, rtm_enabled: options.rtmEnabled ?? true, ...options.tournament },
    teams, players, categories: [], sponsors: [],
  };
  let stateIndex = 0;
  const react = {
    ...React,
    useState(initial) {
      const index = stateIndex++;
      const value = index === 0 ? data : index === 2 ? options.tab ?? "teams" : index === 3 && selectedTeam ? "team-0" : initial;
      return [value, () => {}];
    },
    useEffect: () => {},
    useMemo: (callback) => callback(),
    useRef: (value) => ({ current: value }),
  };
  const exports = {};
  new Function("require", "exports", code)((name) => {
    if (name === "react") return react;
    if (name === "@/app/auction/PlayerCard") return cardExports;
    if (name === "@/app/auction/PlayerSearch") return searchExports;
    if (name === "@/app/auction/TeamMark") return { __esModule: true, default: ({ name, size }) => React.createElement("span", { "data-team": name, "data-size": size }) };
    if (name === "@/app/auction/DeveloperWatermark") return { __esModule: true, default: () => React.createElement("div", null, "Developed By Beyond Boundaries") };
    if (name === "@/lib/auction/pricing") return { getAuctionBasePrice: () => 0 };
    if (name === "@/lib/auction/player-category") return categoryExports;
    if (name === "@/lib/auction/sponsors") return { sortSponsors: (sponsors) => sponsors };
    if (name === "@/lib/supabase/client") return { supabase: {} };
    if (name.startsWith("@/app/") || name === "../sold-fireworks") return { __esModule: true, default: () => null };
    return require(name);
  }, exports);
  return renderToStaticMarkup(exports.default({ slug: "test" }));
}

test("projector displays the developer watermark", () => {
  assert.match(renderProjector(8), /Developed By Beyond Boundaries/);
});

test("spotlight uses the large projector logo for the bidding and winning team", () => {
  const player = { id: "player", player_number: 1, full_name: "Player", category: "A", status: "available" };
  const options = { tab: "live", players: [player], tournament: { projector_theme: "spotlight", current_player_id: "player", current_bid_team_id: "team-0", current_bid: 10 } };
  assert.match(renderProjector(1, false, options), /data-team="Team 0" data-size="projector"/);
  assert.match(renderProjector(1, false, { ...options, players: [{ ...player, status: "sold", sold_team_id: "team-0" }], tournament: { ...options.tournament, current_bid_team_id: null } }), /data-team="Team 0" data-size="projector"/);
  assert.doesNotMatch(renderProjector(1, false, { ...options, tournament: { ...options.tournament, current_bid_team_id: null } }), /data-size="projector"/);
});

test("team grid renders every team without pagination", () => {
  for (const count of [8, 13]) {
    const html = renderProjector(count);
    assert.equal((html.match(/aria-label="View Team \d+ squad"/g) ?? []).length, count);
    assert.doesNotMatch(html, /Page \d+ \/ \d+/);
  }
});

test("team squads show all players in one scrollable region", () => {
  const html = renderProjector(8, true);
  assert.doesNotMatch(html, /Page \d+ \/ \d+/);
  assert.match(html, /role="region" aria-label="Team squad" tabindex="0"[^>]*overflow-y-auto/);
  for (let index = 0; index < 7; index++) assert.match(html, new RegExp(`>Player ${index}</h3>`));
});

test("team squads show category, squad size and balance without replacing the player role", () => {
  const players = [
    { id: "p1", player_number: 1, full_name: "Player One", category: "Gold", role: "Bowler", status: "sold", sold_team_id: "team-0", sold_price: 10 },
    { id: "p2", player_number: 2, full_name: "Player Two", category: " None ", role: null, status: "sold", sold_team_id: "team-0", sold_price: 20 },
  ];
  const html = renderProjector(1, true, { players, playerFields: ["skill"] });
  assert.match(html, /Team 0 Squad/);
  assert.match(html, /Squad size<\/p><p[^>]*>2\/8/);
  assert.match(html, /Balance<\/p><p[^>]*>100/);
  assert.match(html, /Category: <\/span>Gold/);
  assert.match(html, />Bowler<\/p>/);
  assert.doesNotMatch(html, /Category: <\/span>\s*None/i);
  const hidden = renderProjector(1, true, { players, playerFields: ["skill"], showCategory: false });
  assert.doesNotMatch(hidden, /Category: <\/span>/);
  assert.match(hidden, />Bowler<\/p>/);
});

test("empty team squad shows the styled empty state without player cards", () => {
  const html = renderProjector(1, true, { players: [] });
  assert.match(html, /Team 0 Squad/);
  assert.match(html, /Squad update/);
  assert.match(html, /No players picked yet/);
  assert.doesNotMatch(html, /No players in this squad yet/);
});

test("team summary scrolls all teams with an accessible duplicate only when needed", () => {
  const moving = renderProjector(8);
  assert.match(moving, /sponsor-strip-track/);
  assert.match(moving, /animation-duration:96s/);
  assert.match(moving, /sponsor-strip-duplicate" aria-hidden="true"/);
  assert.equal((moving.match(/title="Team \d+"/g) ?? []).length, 16);

  const stationary = renderProjector(4);
  assert.doesNotMatch(stationary, /sponsor-strip-track/);
  assert.equal((stationary.match(/title="Team \d+"/g) ?? []).length, 4);
});

test("projector player list uses viewer details and respects configured fields and RTM", () => {
  const players = [
    { id: "one", player_number: 1, full_name: "First Player", category: "A", role: "Bowler", batting_style: "Right hand", bowling_style: "Spin", photo_url: null, status: "sold", sold_team_id: "team-0", sold_price: 12500, rtm_team_id: "team-0" },
    { id: "two", player_number: 2, full_name: "Second Player", category: "B", role: null, batting_style: null, bowling_style: null, photo_url: null, status: "available", sold_team_id: null, sold_price: null, rtm_team_id: null },
    { id: "three", player_number: 3, full_name: "Third Player", category: "B", role: null, batting_style: null, bowling_style: null, photo_url: null, status: "unsold", sold_team_id: null, sold_price: null, rtm_team_id: null },
  ];
  const html = renderProjector(1, false, { tab: "players", players, playerFields: ["skill", "batting_style", "bowling_style"] });
  assert.match(html, /#1/);
  assert.match(html, /Bowler/);
  assert.match(html, /Category: A/);
  assert.match(html, /Category: B/);
  assert.match(html, /Right hand/);
  assert.match(html, /Spin/);
  assert.match(html, /Team 0 · 12,500/);
  assert.match(html, /Player bought through RTM/);
  assert.match(html, />Available</);
  assert.match(html, />Unsold</);

  const limited = renderProjector(1, false, { tab: "players", players, playerFields: [], rtmEnabled: false });
  assert.doesNotMatch(limited, /Bowler|Right hand|Spin|Player bought through RTM/);
  const hidden = renderProjector(1, false, { tab: "players", players, playerFields: ["skill"], showCategory: false });
  assert.doesNotMatch(hidden, /Category: [AB]/);
  assert.match(hidden, /Bowler/);
});

test("dense viewer cards preserve long player details and sale information", () => {
  const player = { player_number: 1, full_name: "A Very Long Player Name", category: "SuperLongCategory", role: "All Rounder", batting_style: "Right hand", bowling_style: "Spin", photo_url: null, status: "sold", sold_team_id: "team-0", sold_price: 12500, rtm_team_id: "team-0" };
  const html = renderToStaticMarkup(React.createElement(cardExports.default, {
    player, teams: [{ id: "team-0", name: "Team One" }], rtmEnabled: true,
    playerFields: ["skill", "batting_style", "bowling_style"], showCategory: true, dense: true,
  }));
  for (const text of ["A Very Long Player Name", "Category: SuperLongCategory", "All Rounder", "Right hand", "Spin", "Team One · 12,500", "Player bought through RTM"]) assert.ok(html.includes(text));
  assert.match(html, /<h3 class="[^"]*overflow-wrap:anywhere[^"]*">A Very Long Player Name<\/h3>/);
});
