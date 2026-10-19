"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TournamentLogo from "../../components/TournamentLogo";

type Category = "Batting" | "Bowling" | "Fielding" | "MVP";
type Row = Record<string, string | number> & { __season?: number; __playerKey?: string };
type SeasonData = Record<Category, Row[]>;
type Column = { key: string; label: string; numeric?: boolean; hideOnSmall?: boolean };

const SEASONS = [
  { season: 1, id: "164635" },
  { season: 2, id: "296154" },
  { season: 3, id: "488984" },
  { season: 4, id: "751465" },
  { season: 5, id: "1125302" },
  { season: 6, id: "1606121" },
  { season: 7, id: "2206973" }
];
const CATEGORIES: Category[] = ["Batting", "Bowling", "Fielding", "MVP"];
const FILE_CATEGORY: Record<Category, string> = {
  Batting: "batting",
  Bowling: "bowling",
  Fielding: "fielding",
  MVP: "mvp",
};

const COLUMNS: Record<Category, Column[]> = {
  Batting: [
    { key: "name", label: "Player" },
    { key: "total_match", label: "Matches", numeric: true },
    { key: "innings", label: "Innings", numeric: true, hideOnSmall: true },
    { key: "total_runs", label: "Runs", numeric: true },
    { key: "highest_run", label: "High Score", numeric: true },
    { key: "average", label: "Average", numeric: true },
    { key: "strike_rate", label: "Strike Rate", numeric: true },
    { key: "4s", label: "4s", numeric: true, hideOnSmall: true },
    { key: "6s", label: "6s", numeric: true, hideOnSmall: true },
    { key: "50s", label: "50s", numeric: true, hideOnSmall: true },
    { key: "100s", label: "100s", numeric: true, hideOnSmall: true },
  ],
  Bowling: [
    { key: "name", label: "Player" },
    { key: "total_match", label: "Matches", numeric: true },
    { key: "innings", label: "Innings", numeric: true, hideOnSmall: true },
    { key: "total_wickets", label: "Wickets", numeric: true },
    { key: "highest_wicket", label: "Best Wkts", numeric: true },
    { key: "runs", label: "Runs", numeric: true },
    { key: "overs", label: "Overs", numeric: true, hideOnSmall: true },
    { key: "economy", label: "Economy", numeric: true },
    { key: "avg", label: "Average", numeric: true, hideOnSmall: true },
    { key: "SR", label: "Strike Rate", numeric: true, hideOnSmall: true },
    { key: "maidens", label: "Maidens", numeric: true, hideOnSmall: true },
  ],
  Fielding: [
    { key: "name", label: "Player" },
    { key: "total_match", label: "Matches", numeric: true },
    { key: "catches", label: "Catches", numeric: true },
    { key: "caught_behind", label: "Keeper Catches", numeric: true, hideOnSmall: true },
    { key: "run_outs", label: "Run Outs", numeric: true },
    { key: "stumpings", label: "Stumpings", numeric: true, hideOnSmall: true },
    { key: "caught_and_bowl", label: "Caught & Bowled", numeric: true, hideOnSmall: true },
    { key: "total_dismissal", label: "Dismissals", numeric: true },
  ],
  MVP: [
    { key: "name", label: "Player" },
    { key: "matches", label: "Matches", numeric: true },
    { key: "batting", label: "Batting Points", numeric: true },
    { key: "bowling", label: "Bowling Points", numeric: true },
    { key: "fielding", label: "Fielding Points", numeric: true },
    { key: "total", label: "MVP Points", numeric: true },
  ],
};

function parseCsv(text: string): Row[] {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) records.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some((value) => value !== "")) records.push(row);
  }
  if (records.length < 2) return [];
  const headers = records[0].map((header) => header.replace(/^\uFEFF/, "").trim());
  return records.slice(1).map((values) => {
    const record: Row = {};
    headers.forEach((header, index) => {
      const value = values[index] ?? "";
      const numeric = value !== "" && /^-?\d+(\.\d+)?$/.test(value);
      record[header] = numeric ? Number(value) : value;
    });
    return record;
  });
}

function numberOf(row: Row, key: string): number {
  const value = row[key];
  return typeof value === "number" ? value : Number(value) || 0;
}
function textOf(row: Row, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Unknown player";
}
function normalizeName(value: unknown): string {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}
function playerKey(row: Row): string {
  const id = row.player_id;
  return id !== undefined && id !== null && String(id).trim() !== "" ? String(id).trim() : "";
}
function aggregateRows(rows: Row[], category: Category): Row[] {
  const groups = new Map<string, Row[]>();
  rows.forEach((row) => {
    const key = playerKey(row);
    // CricHeroes player ID is the canonical identity. Rows without an ID are excluded
    // rather than incorrectly merging unrelated players by display name.
    if (!key) return;
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  });
  return Array.from(groups.values()).map((group) => {
    const latest = [...group].sort((a, b) => (b.__season ?? 0) - (a.__season ?? 0))[0];
    const result: Row = { ...latest, __playerKey: playerKey(latest) };
    const sum = (key: string) => group.reduce((total, row) => total + numberOf(row, key), 0);
    const max = (key: string) => Math.max(...group.map((row) => numberOf(row, key)));
    if (category === "Batting") {
      ["total_match", "innings", "total_runs", "not_out", "ball_faced", "4s", "6s", "50s", "100s"].forEach((key) => (result[key] = sum(key)));
      result.highest_run = max("highest_run");
      result.average = sum("innings") - sum("not_out") > 0 ? sum("total_runs") / (sum("innings") - sum("not_out")) : 0;
      result.strike_rate = sum("ball_faced") > 0 ? (sum("total_runs") / sum("ball_faced")) * 100 : 0;
    } else if (category === "Bowling") {
      ["total_match", "innings", "total_wickets", "balls", "maidens", "runs", "dot_balls"].forEach((key) => (result[key] = sum(key)));
      result.highest_wicket = max("highest_wicket");
      // Cricket overs are stored as overs notation in source files; aggregate using balls.
      result.overs = Math.floor(sum("balls") / 6) + (sum("balls") % 6) / 10;
      result.economy = sum("balls") > 0 ? (sum("runs") / sum("balls")) * 6 : 0;
      result.avg = sum("total_wickets") > 0 ? sum("runs") / sum("total_wickets") : 0;
      result.SR = sum("total_wickets") > 0 ? sum("balls") / sum("total_wickets") : 0;
    } else if (category === "Fielding") {
      ["total_match", "catches", "caught_behind", "run_outs", "assist_run_outs", "stumpings", "caught_and_bowl", "total_catches", "total_dismissal"].forEach((key) => (result[key] = sum(key)));
    } else if (category === "MVP") {
      ["matches", "batting", "bowling", "fielding", "total"].forEach((key) => (result[key] = sum(key)));
    }
    return result;
  });
}
function formatValue(value: string | number | undefined): string {
  if (value === undefined || value === "") return "";
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString("en-IN") : value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  return value;
}

export default function FriendshipCupStats() {
  const [season, setSeason] = useState("all");
  const [category, setCategory] = useState<Category>("Batting");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("total_runs");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [data, setData] = useState<SeasonData>({ Batting: [], Bowling: [], Fielding: [], MVP: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        const response = await fetch("/api/fc-season-stats", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to load stats from Supabase.");
        const next: SeasonData = { Batting: [], Bowling: [], Fielding: [], MVP: [] };
        const uploaded = (payload.files ?? []) as Array<{ season: number; category: string; csv_content: string }>;
        const bySeasonCategory = new Map(uploaded.map((item) => [`${item.season}:${item.category}`, item.csv_content]));
        const categoryMap: Record<string, Category> = { batting: "Batting", bowling: "Bowling", fielding: "Fielding", mvp: "MVP" };
        for (const item of uploaded) {
          const category = categoryMap[item.category];
          if (!category) continue;
          const rows = parseCsv(item.csv_content).map((row) => ({ ...row, __season: item.season }));
          if (category !== "MVP") next[category].push(...rows);
        }
        // MVP CSVs are matched to canonical CricHeroes IDs from the same season's
        // batting/bowling/fielding uploads, with a globally unique-name fallback.
        const globalIdsByName = new Map<string, Set<string>>();
        const globalCanonicalNameById = new Map<string, string>();
        ( ["Batting", "Bowling", "Fielding"] as Category[]).forEach((cat) => next[cat].forEach((row) => {
          const id = playerKey(row); const normalized = normalizeName(textOf(row, "name", "Player Name", "player_name"));
          if (!id || !normalized) return;
          const ids = globalIdsByName.get(normalized) ?? new Set<string>(); ids.add(id); globalIdsByName.set(normalized, ids);
          globalCanonicalNameById.set(id, textOf(row, "name", "Player Name", "player_name"));
        }));
        for (const seasonInfo of SEASONS) {
          const mvpText = bySeasonCategory.get(`${seasonInfo.season}:mvp`);
          if (!mvpText) continue;
          const seasonIdsByName = new Map<string, Set<string>>();
          const seasonNamesById = new Map<string, string>();
          ( ["Batting", "Bowling", "Fielding"] as Category[]).forEach((cat) => next[cat].filter((row) => row.__season === seasonInfo.season).forEach((row) => {
            const id = playerKey(row); const normalized = normalizeName(textOf(row, "name", "Player Name", "player_name"));
            if (!id || !normalized) return;
            const ids = seasonIdsByName.get(normalized) ?? new Set<string>(); ids.add(id); seasonIdsByName.set(normalized, ids);
            seasonNamesById.set(id, textOf(row, "name", "Player Name", "player_name"));
          }));
          parseCsv(mvpText).forEach((sourceRow) => {
            const sourceName = textOf(sourceRow, "Player Name", "name", "player_name");
            const normalized = normalizeName(sourceName);
            const ids = seasonIdsByName.get(normalized) ?? globalIdsByName.get(normalized);
            if (!ids || ids.size !== 1) return;
            const id = Array.from(ids)[0];
            const batting = numberOf(sourceRow, "Batting"); const bowling = numberOf(sourceRow, "Bowling"); const fielding = numberOf(sourceRow, "Fielding");
            next.MVP.push({ player_id: id, name: seasonNamesById.get(id) ?? globalCanonicalNameById.get(id) ?? sourceName, matches: numberOf(sourceRow, "Matches"), batting, bowling, fielding, total: numberOf(sourceRow, "Total") || batting + bowling + fielding, __season: seasonInfo.season });
          });
        }
        if (active) setData(next);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "We couldn’t load the statistics just now. Please refresh the page and try again.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  const allSeasonRows = useMemo(() => aggregateRows(data[category], category), [data, category]);
  const rows = useMemo(() => {
    const source = season === "all" ? allSeasonRows : data[category].filter((row) => String(row.__season) === season);
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const filtered = source.filter((row) => {
      if (!normalizedSearch) return true;
      const name = textOf(row, "name");
      return name.toLocaleLowerCase().includes(normalizedSearch);
    });
    return [...filtered].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      let compare = 0;
      // Excel sheets can contain numeric-looking values stored as text. Sort based on
      // the column definition rather than JavaScript's runtime value type.
      const sortColumn = COLUMNS[category].find((column) => column.key === sortKey);
      if (sortColumn?.numeric) {
        compare = numberOf(a, sortKey) - numberOf(b, sortKey);
      } else {
        compare = String(aValue ?? "").localeCompare(String(bValue ?? ""), undefined, { numeric: true, sensitivity: "base" });
      }
      return sortDirection === "desc" ? -compare : compare;
    });
  }, [allSeasonRows, category, data, search, season, sortDirection, sortKey]);

  const columns = COLUMNS[category].filter((column) => {
    // Do not render columns that have no meaningful data in the current view.
    const currentRows = season === "all" ? allSeasonRows : data[category].filter((row) => String(row.__season) === season);
    return currentRows.some((row) => row[column.key] !== undefined && row[column.key] !== null && String(row[column.key]).trim() !== "");
  });
  const playerCount = rows.length;
  const currentSeasonLabel = season === "all" ? "All Seasons" : `Season ${season}`;
  const leaders = useMemo(() => {
    const mainKey = category === "Batting" ? "total_runs" : category === "Bowling" ? "total_wickets" : category === "Fielding" ? "total_dismissal" : "total";
    return [...(season === "all" ? allSeasonRows : data[category].filter((row) => String(row.__season) === season))]
      .sort((a, b) => numberOf(b, mainKey) - numberOf(a, mainKey)).slice(0, 3);
  }, [allSeasonRows, category, data, season]);

  useEffect(() => {
    const defaultSort = category === "Batting" ? "total_runs" : category === "Bowling" ? "total_wickets" : category === "Fielding" ? "total_dismissal" : "total";
    setSortKey(defaultSort);
    setSortDirection("desc");
  }, [category, season]);

  return (
    <main className="min-h-screen site-page-surface text-slate-950">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <Link href="/tournaments/friendshipcup" className="inline-flex items-center gap-2 rounded-lg border border-orange-400/40 bg-orange-500/10 px-4 py-2.5 text-sm font-extrabold text-orange-600 transition hover:border-orange-300 hover:bg-orange-500/20">
          <span aria-hidden="true">←</span> Back to Friendship Cup
        </Link>
      </div>
      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/20 via-slate-50 to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <TournamentLogo tournament="friendshipcup" className="h-28 w-28 sm:h-36 sm:w-36" />
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Stats</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Every run, wicket and moment that shaped the tournament. Explore player leaderboards across Friendship Cup seasons.</p>
            </div>
            <div className="w-full md:max-w-xs">
              <label htmlFor="season-select" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Choose season</label>
              <select id="season-select" value={season} onChange={(event) => setSeason(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20">
                <option value="all">All Seasons · Career totals</option>
                {SEASONS.map(({ season: seasonNumber }) => <option key={seasonNumber} value={String(seasonNumber)}>Season {seasonNumber}</option>)}
              </select>
              <p className="mt-2 text-xs text-slate-500">Historical seasons: 1–6 · Season 7 in progress</p>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Seasons", value: "07", icon: "◷" },
              { label: "Current view", value: currentSeasonLabel, icon: "⌁" },
              { label: "Players listed", value: loading ? "…" : playerCount.toLocaleString("en-IN"), icon: "♙" },
            ].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 backdrop-blur-sm sm:p-5"><div className="flex items-center justify-between text-sm text-slate-500"><span>{item.label}</span><span className="text-lg text-orange-600">{item.icon}</span></div><div className="mt-3 truncate text-xl font-extrabold sm:text-2xl">{item.value}</div></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">The record books</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">Player Leaderboards</h2>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <label htmlFor="player-search" className="sr-only">Search player</label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
            <input id="player-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search player…" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-950 outline-none placeholder:text-slate-500 focus:border-orange-400" />
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl sm:grid-cols-4 border border-slate-200 bg-white p-2">
          {CATEGORIES.map((item, index) => {
            const active = category === item;
            const icons = ["🏏", "🔴", "🧤", "🏆"];
            return <button key={item} onClick={() => setCategory(item)} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-sm font-bold transition sm:text-base ${active ? "bg-orange-500 text-white shadow-lg shadow-orange-950/30" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`} aria-pressed={active}><span>{icons[index]}</span>{item}</button>;
          })}
        </div>

        {leaders.length > 0 && !loading && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {leaders.map((leader, index) => {
              const name = textOf(leader, "name");
              const key = category === "Batting" ? "total_runs" : category === "Bowling" ? "total_wickets" : category === "Fielding" ? "total_dismissal" : "total";
              const label = category === "Batting" ? "Runs" : category === "Bowling" ? "Wickets" : category === "Fielding" ? "Dismissals" : "MVP Points";
              return <div key={`${name}-${index}`} className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${index === 0 ? "border-orange-400/40 bg-gradient-to-br from-orange-100 to-white" : "border-slate-200 bg-white"}`}><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-widest text-slate-500">{index === 0 ? "Leading player" : `Rank ${index + 1}`}</span><span className="text-xl">{["🥇", "🥈", "🥉"][index]}</span></div><div className="mt-3 truncate text-lg font-extrabold">{name}</div><div className="mt-4 flex items-baseline gap-2"><span className="text-3xl font-black text-orange-600">{formatValue(leader[key])}</span><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span></div></div>;
            })}
          </div>
        )}

        <div className="mt-5 overflow-visible rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-black/10">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div><h3 className="font-bold">{category} leaderboard</h3><p className="mt-1 text-xs text-slate-500">{currentSeasonLabel} · {playerCount.toLocaleString("en-IN")} players</p></div>
            <div className="hidden text-xs text-slate-500 md:block">Select a column heading to sort</div>
          </div>
          {error ? <div className="p-10 text-center text-sm text-red-700">{error}</div> : loading ? <div className="p-12 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-orange-400"/><p className="mt-4 text-sm text-slate-500">Loading season statistics…</p></div> : rows.length === 0 ? <div className="p-12 text-center"><p className="font-bold text-slate-700">No players found</p><p className="mt-2 text-sm text-slate-500">Try another search or season.</p></div> : (
            <div className="divide-y divide-slate-200">
              {rows.map((row, index) => {
                const playerName = textOf(row, "name", "Player Name", "player_name");
                const mainKey = category === "Batting" ? "total_runs" : category === "Bowling" ? "total_wickets" : category === "Fielding" ? "total_dismissal" : "total";
                const mainLabel = category === "Batting" ? "Runs" : category === "Bowling" ? "Wickets" : category === "Fielding" ? "Dismissals" : "MVP Points";
                const rowId = `${playerKey(row)}-${row.__season ?? "all"}-${index}`;
                const expanded = expandedPlayers.has(rowId);
                const detailColumns = columns.filter((column) => column.key !== "name" && column.key !== mainKey);
                return <article key={rowId} className={`px-4 py-4 sm:px-5 ${index === 0 ? "bg-gradient-to-r from-emerald-50 to-transparent" : ""}`}>
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <span className="w-7 shrink-0 text-sm font-bold text-slate-500">{index + 1}</span>
                    <div className="min-w-0 flex-1"><h4 className="break-words text-base font-extrabold text-slate-950 sm:text-lg">{playerName}</h4></div>
                    <div className="shrink-0 text-right"><div className="text-2xl font-black text-orange-600 sm:text-3xl">{formatValue(row[mainKey] ?? "")}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{mainLabel}</div></div>
                  </div>
                  <div className="mt-3 flex justify-end"><button type="button" aria-expanded={expanded} onClick={() => setExpandedPlayers((current) => { const next = new Set(current); if (next.has(rowId)) next.delete(rowId); else next.add(rowId); return next; })} className="rounded-lg border border-emerald-300/20 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-orange-300/50 hover:text-orange-600">Details <span className="ml-1 text-orange-400">{expanded ? "×" : "+"}</span></button></div>
                  {expanded && <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3 lg:grid-cols-4">{detailColumns.map((column) => { const value = row[column.key]; const empty = value === undefined || value === null || String(value).trim() === ""; return <div key={column.key} className="min-w-0 rounded-lg bg-slate-50 px-3 py-2"><div className="break-words text-[10px] font-semibold uppercase tracking-wider text-slate-500">{column.label}</div><div className="mt-1 break-words text-sm font-bold tabular-nums text-slate-800">{empty ? "—" : formatValue(value)}</div></div>; })}</div>}
                </article>;
              })}
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-xs leading-6 text-slate-500">Friendship Cup · Celebrating the players, teams and moments behind every season.</p>
      </section>
    </main>
  );
}
