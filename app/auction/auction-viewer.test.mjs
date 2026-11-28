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
const code = ts.transpileModule(readFileSync(new URL("./[tournament]/auction-public.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const searchCode = ts.transpileModule(readFileSync(new URL("./PlayerSearch.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const searchExports = {};
new Function("require", "exports", searchCode)(require, searchExports);

function renderTeam(players, squadView = "cards", showCategory = true, screen = "overview", tournamentOverrides = {}, sponsors = []) {
  const states = [screen, "team-one", "unsold", "all", "no match", "home"];
  const react = {
    ...React,
    useState: () => [states.shift(), () => {}],
    useMemo: (callback) => callback(),
    useEffect: () => {},
    useRef: (value) => ({ current: value }),
  };
  const exports = {};
  new Function("require", "exports", `${code}\nexports.TestViewer = AuctionHomeViewer;`)((name) => {
    if (name === "react") return react;
    if (name === "react-dom") return { preload: () => {} };
    if (name === "@/app/auction/PlayerCard") return { __esModule: true, default: ({ player, dense }) => React.createElement("article", { "data-dense": dense || undefined }, player.full_name) };
    if (name === "@/app/auction/PlayerSearch") return searchExports;
    if (name === "@/app/auction/DeveloperWatermark") return { __esModule: true, default: () => React.createElement("div", null, "Developed By Beyond Boundaries") };
    if (name === "@/app/auction/useMainSite") return { useMainSite: () => true };
    if (name === "@/lib/auction/pricing") return { getAuctionBasePrice: () => 0 };
    if (name === "@/lib/auction/player-category") return categoryExports;
    if (name === "@/lib/auction/projector-fields") return { isProjectorPlayerFields: () => true };
    if (name === "@/lib/auction/viewer-squad-view") return { isViewerSquadView: () => true };
    if (name === "@/lib/auction/sponsors") return { sortSponsors: (sponsors) => sponsors };
    if (name === "@/lib/supabase/client") return { supabase: {} };
    if (name.startsWith("@/app/") || name.startsWith("next/") || name === "./sold-fireworks") return { __esModule: true, default: () => null };
    return require(name);
  }, exports);
  return renderToStaticMarkup(React.createElement(exports.TestViewer, {
    tournament: { name: "Test", status: "setup", min_squad_size: 0, base_price: 0, organizer_logo_urls: [], projector_player_fields: [], show_player_category: showCategory, viewer_squad_view: squadView, ...tournamentOverrides },
    teams: [{ id: "team-1", name: "Team One", slug: "team-one", logo_url: null, points_remaining: 100, rtm_count: 0 }],
    players, priceCategories: [], sponsors, refreshMessage: "",
  }));
}

test("viewer places the watermark in bottom navigation on mobile and desktop", () => {
  const overview = renderTeam([]);
  const sponsors = renderTeam([], "cards", true, "sponsors");
  for (const html of [overview, sponsors]) {
    assert.match(html, /aria-label="Viewer navigation">.*<div>Developed By Beyond Boundaries<\/div><\/nav>/);
    assert.doesNotMatch(html.split('aria-label="Viewer navigation"')[0], /Developed By Beyond Boundaries/);
  }
});

test("colored status counts become accessible filters only on the player screen", () => {
  const players = [
    { id: "p1", full_name: "Player One", player_number: 1, category: "Gold", status: "sold" },
    { id: "p2", full_name: "Player Two", player_number: 2, category: "Gold", status: "unsold" },
    { id: "p3", full_name: "Player Three", player_number: 3, category: "Gold", status: "available" },
  ];
  const html = renderTeam(players, "cards", true, "players");
  const overview = renderTeam(players);
  for (const [label, selected] of [["Sold", false], ["Unsold", true], ["Available", false]]) {
    assert.match(html, new RegExp(`<button type="button" aria-label="${label} players: 1" aria-pressed="${selected}"`));
    assert.match(overview, new RegExp(`<span aria-label="${label}: 1"`));
    assert.doesNotMatch(overview, new RegExp(`aria-label="${label} players: 1"`));
  }
  assert.match(html, /aria-label="All players: 3" aria-pressed="false"[^>]*bg-slate-500[^>]*>All · 3<\/button>/);
  assert.match(overview, /<span aria-label="All players: 3"[^>]*bg-slate-500[^>]*>All · 3<\/span>/);
  assert.match(html, /<input[^>]*aria-label="Search players"[^>]*\/><\/div><span aria-label="0 of 3 players"[^>]*>0\/3<\/span><\/div>/);
});

test("viewer player list uses the dense responsive grid", () => {
  const players = [{ id: "p1", full_name: "No Match Player", player_number: 1, category: "Gold", status: "unsold" }];
  const html = renderTeam(players, "cards", true, "players");
  assert.match(html, /class="grid grid-cols-2 gap-2 lg:grid-cols-4"><article data-dense="true">No Match Player<\/article>/);
});

test("category selector keeps the full accessible name when the trigger is abbreviated", () => {
  const source = ts.transpileModule(readFileSync(new URL("./ViewerSelect.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function("require", "exports", source)(require, exports);
  const html = renderToStaticMarkup(React.createElement(exports.default, {
    label: "Filter players by category", value: "all", compactLabel: "ALL",
    options: [{ value: "all", label: "All categories" }], onChange: () => {},
  }));
  assert.match(html, /aria-label="Filter players by category: All categories"/);
  assert.match(html, /class="min-w-0 truncate sm:hidden [^"]*">ALL<\/span><span class="hidden max-w-28 truncate sm:inline [^"]*">All categories<\/span>/);
});

test("sponsor page displays each sponsor once and preserves optional links", () => {
  const sponsors = [
    { id: "s1", name: "Logo Sponsor", sponsor_title: "Title Sponsor", logo_url: "https://example.com/logo.png", website_url: "https://example.com" },
    { id: "s2", name: "Text Sponsor", sponsor_title: null, logo_url: null, website_url: null },
  ];
  const html = renderTeam([], "cards", true, "sponsors", {}, sponsors);
  assert.match(html, /href="https:\/\/example.com" target="_blank" rel="noreferrer" aria-label="Title Sponsor: Logo Sponsor"/);
  assert.match(html, /aria-label="Text Sponsor" class=/);
  assert.equal((html.match(/>Logo Sponsor<\/p>/g) ?? []).length, 1);
  assert.equal((html.match(/>Text Sponsor<\/p>/g) ?? []).length, 1);
});

test("sponsor strip preserves links and hides duplicate cards from assistive technology", () => {
  const sponsors = [{ id: "s1", name: "Test Sponsor", sponsor_title: "Title Sponsor", logo_url: null, website_url: "https://example.com" }];
  const html = renderTeam([], "cards", true, "overview", {}, sponsors);
  assert.match(html, /aria-label="Tournament sponsors"/);
  assert.match(html, /href="https:\/\/example.com" target="_blank" rel="noreferrer" aria-label="Title Sponsor: Test Sponsor"/);
  assert.match(html, /sponsor-strip-duplicate" aria-hidden="true">.*tabindex="-1" aria-label="Title Sponsor: Test Sponsor"/);
});

test("bidding panel displays configured player details and hides disabled or empty details", () => {
  const player = { id: "p1", full_name: "Player One", player_number: 1, category: "Gold", role: "All Rounder", previous_team: "Team Two", status: "available" };
  const settings = { current_player_id: "p1", projector_player_fields: ["skill", "previous_team"] };
  const html = renderTeam([player], "cards", true, "overview", settings);
  assert.match(html, /class="absolute left-0 top-0[^"]*">#1<\/span>/);
  assert.match(html, /class="min-w-0 text-center"><p[^>]*>Auction schedule<\/p><p[^>]*>Player One<\/p>.*?<dl class="mt-1 flex flex-wrap justify-center gap-1 lg:items-start">/);
  assert.match(html, /<dt[^>]*>Category<\/dt><dd[^>]*>Gold<\/dd>/);
  assert.match(html, /<dt[^>]*>Player Role<\/dt><dd[^>]*>All Rounder<\/dd>/);
  assert.match(html, /<dt[^>]*>Previous team<\/dt><dd[^>]*>Team Two<\/dd>/);
  const hidden = renderTeam([{ ...player, category: "None", previous_team: " " }], "cards", false, "overview", { ...settings, projector_player_fields: ["previous_team"] });
  assert.doesNotMatch(hidden, /<dt[^>]*>(Category|Player Role|Previous team)<\/dt>/);
});

test("auction status remains visible with or without a current player", () => {
  const player = { id: "p1", full_name: "Player One", player_number: 1, category: "", status: "available" };
  for (const [status, label] of [["live", "Auction is live"], ["paused", "Auction paused"], ["completed", "Auction completed"], ["setup", "Auction schedule"]]) {
    for (const current of [false, true]) {
      const html = renderTeam(current ? [player] : [], "cards", true, "overview", { status, current_player_id: current ? "p1" : null });
      assert.equal(html.split(label).length - 1, 1);
    }
  }
});

test("bidding panel labels the displayed price for live, base-price and sold states", () => {
  const player = { id: "p1", full_name: "Player One", player_number: 1, category: "", status: "available", sold_team_id: "team-1", sold_price: 150 };
  const settings = { current_player_id: "p1", current_bid_team_id: "team-1", current_bid: 100 };
  assert.match(renderTeam([player], "cards", true, "overview", settings), /<p class="whitespace-nowrap[^"]*">Current bid<\/p><p[^>]*>100<\/p>/);
  assert.match(renderTeam([player], "cards", true, "overview", { ...settings, current_bid: null }), /<p class="whitespace-nowrap[^"]*">Base Points<\/p><p[^>]*>0<\/p>/);
  assert.match(renderTeam([{ ...player, status: "sold" }], "cards", true, "overview", settings), />Sold for<\/p><p[^>]*>150<\/p>/);
  assert.match(renderTeam([player], "cards", true, "overview", { ...settings, current_bid_team_id: null }), />Base Points: <\/span><span[^>]*>100<\/span>/);
});

test("viewer loading uses the tournament logo or Beyond Auctions on both loading paths", async () => {
  const pageCode = ts.transpileModule(readFileSync(new URL("./[tournament]/page.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const routeCode = ts.transpileModule(readFileSync(new URL("../api/auctions/[slug]/logo/route.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  for (const [logo, expected] of [[null, "/beyond-auctions-logo.png"], ["https://example.com/tournament.png", "https://example.com/tournament.png"]]) {
    const supabaseAdmin = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { tournament_logo_url: logo }, error: null }) }) }) }),
    };
    const load = (source) => {
      const exports = {};
      new Function("require", "exports", source)((name) => {
        if (name === "@/lib/supabase/admin") return { supabaseAdmin };
        if (name === "./auction-public") return { __esModule: true, default: () => null };
        if (name === "next/server") return { NextResponse: { redirect: (url, options) => ({ url: String(url), options }) } };
        return require(name);
      }, exports);
      return exports;
    };
    const page = await load(pageCode).default({ params: Promise.resolve({ tournament: "test" }) });
    assert.equal(page.props.loadingLogoUrl, expected);
    const response = await load(routeCode).GET(new Request("http://localhost/api/auctions/test/logo"), { params: Promise.resolve({ slug: "test" }) });
    assert.equal(response.url, new URL(expected, "http://localhost").href);
    assert.equal(response.options.headers["Cache-Control"], "no-store");
  }
});

test("viewer loading gives the fallback logo a light background without changing uploaded logos", () => {
  const react = {
    ...React,
    useState: (initial) => [initial, () => {}],
    useMemo: (callback) => callback(),
    useEffect: () => {},
    useRef: (value) => ({ current: value }),
  };
  const exports = {};
  new Function("require", "exports", code)((name) => {
    if (name === "react") return react;
    if (name === "react-dom") return { preload: () => {} };
    if (name === "next/image") return { __esModule: true, default: ({ src, alt, className }) => React.createElement("img", { src, alt, className }) };
    if (name === "@/app/auction/useMainSite") return { useMainSite: () => true };
    if (name.startsWith("@/app/") || name.startsWith("@/lib/") || name.startsWith("next/") || name === "./sold-fireworks") return { __esModule: true, default: () => null };
    return require(name);
  }, exports);
  const render = (loadingLogoUrl) => renderToStaticMarkup(React.createElement(exports.default, { slug: "test", view: "home", loadingLogoUrl }));
  assert.match(render("/beyond-auctions-logo.png"), /bg-stone-50/);
  assert.match(render(undefined), /bg-stone-50/);
  assert.doesNotMatch(render("https://example.com/tournament.png"), /bg-stone-50/);
});

test("team squad shows an empty state only when no players have been picked", () => {
  assert.match(renderTeam([]), /No players picked yet/);
  const html = renderTeam([{ id: "p1", full_name: "Picked Player", player_number: 1, category: "A", status: "sold", sold_team_id: "team-1" }]);
  assert.match(html, /Picked Player/);
  assert.doesNotMatch(html, /No players picked yet/);
});

test("configured field view shows the complete selected squad and handles an empty team", () => {
  const players = Array.from({ length: 15 }, (_, index) => ({
    id: `p${index}`, full_name: `Player ${index}`, player_number: index + 1, category: "A", status: "sold", sold_team_id: "team-1", sold_price: 1000,
  }));
  players.push({ id: "other", full_name: "Other Team", player_number: 16, category: "A", status: "sold", sold_team_id: "team-2", sold_price: 2000 });
  const html = renderTeam(players, "field");
  assert.match(html, /aria-label="Squad field"/);
  assert.equal((html.match(/<li /g) ?? []).length, 15);
  assert.match(html, /Player 14/);
  assert.doesNotMatch(html, /Other Team/);
  assert.match(renderTeam([], "field"), /No players picked yet/);
  assert.doesNotMatch(renderTeam(players), /aria-label="Squad field"/);
  assert.doesNotMatch(html, /Squad display|Field view · Trial/);
});

test("field view shows a single assigned category but not the None placeholder", () => {
  const players = ["Gold", " None ", ""].map((category, index) => ({
    id: `p${index}`, full_name: `Player ${index}`, player_number: index + 1, category, status: "sold", sold_team_id: "team-1", sold_price: 1000,
  }));
  const html = renderTeam(players, "field");
  assert.match(html, /Category: Gold/);
  assert.equal((html.match(/Category:/g) ?? []).length, 1);
  assert.doesNotMatch(renderTeam(players, "field", false), /Category:/);
});

test("squad views order players by highest sold points and put missing prices last", () => {
  const prices = [1000, null, 4000, 0, 4000];
  const players = prices.map((sold_price, index) => ({
    id: `p${index}`, full_name: `Player ${index}`, player_number: index + 1, category: "A", status: "sold", sold_team_id: "team-1", sold_price,
  }));
  const html = renderTeam(players, "field");
  assert.deepEqual([...html.matchAll(/#\d+ Player (\d+)/g)].map((match) => Number(match[1])), [2, 4, 0, 3, 1]);
  const cards = renderTeam(players, "cards");
  assert.deepEqual([...cards.matchAll(/<article>Player (\d+)<\/article>/g)].map((match) => Number(match[1])), [2, 4, 0, 3, 1]);
  assert.deepEqual(players.map((player) => player.sold_price), prices);
  assert.doesNotMatch(html, /Player positions are illustrative/);
});
