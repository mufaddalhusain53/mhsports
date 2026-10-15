"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CsvFile = { season: number; category: string; file_name: string; csv_content: string; updated_at: string };
type CsvRow = Record<string, string>;

function parseCSV(text: string): { headers: string[]; rows: CsvRow[] } {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim()); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) records.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  if (cell.length || row.length) { row.push(cell.trim()); if (row.some((value) => value !== "")) records.push(row); }
  if (!records.length) return { headers: [], rows: [] };
  const headers = records[0].map((value) => value.replace(/^\uFEFF/, "").trim());
  const rows = records.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  return { headers, rows };
}
function normalize(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function isNumericColumn(rows: CsvRow[], key: string) {
  const values = rows.map((row) => row[key]?.trim()).filter((value) => value !== undefined && value !== "");
  return values.length > 0 && values.every((value) => /^-?\d+(\.\d+)?$/.test(value.replace(/,/g, "")));
}
function numericValue(value: string | undefined) {
  if (!value) return 0;
  const cleaned = value.replace(/,/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
function displayLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function findNameKey(headers: string[]) {
  const preferred = ["name", "playername", "player", "fullname", "batsman", "bowler"];
  return headers.find((header) => preferred.includes(normalize(header))) ?? headers.find((header) => normalize(header).includes("name")) ?? "";
}
function defaultSortKey(headers: string[], category: string, rows: CsvRow[]) {
  const candidates: Record<string, string[]> = {
    batting: ["total_runs", "runs", "run", "totalruns", "runs_scored"],
    bowling: ["total_wickets", "wickets", "wicket", "totalwickets"],
    fielding: ["total_dismissal", "dismissals", "total_dismissals", "catches", "run_outs"],
    mvp: ["total", "mvp_points", "points", "total_points", "mvp"],
  };
  const normalizedHeaders = headers.map((header) => ({ header, normalized: normalize(header) }));
  for (const candidate of candidates[category] ?? []) {
    const found = normalizedHeaders.find((item) => item.normalized === normalize(candidate));
    if (found && isNumericColumn(rows, found.header)) return found.header;
  }
  return headers.find((header) => isNumericColumn(rows, header)) ?? headers.find((header) => normalize(header) !== normalize(findNameKey(headers))) ?? headers[0] ?? "";
}
function isMissing(value: string | undefined) {
  return value === undefined || value === null || value.trim() === "" || ["null", "undefined", "n/a", "na"].includes(value.trim().toLowerCase());
}
function isTechnicalId(header: string) {
  const key = normalize(header);
  return key === "playerid" || key === "teamid" || key === "id";
}
function formatValue(value: string) {
  if (value === undefined || value === null || value.trim() === "") return "—";
  const cleaned = value.replace(/,/g, "");
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return value;
}

export default function Stats() {
  const [files, setFiles] = useState<CsvFile[]>([]);
  const [season, setSeason] = useState("1");
  const [category, setCategory] = useState("batting");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    fetch("/api/quadclash100-stats", { cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to load stats"); if (active) setFiles(result.files || []); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load stats"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const file = files.find((item) => item.season === Number(season) && item.category.toLowerCase() === category);
  const table = useMemo(() => file ? parseCSV(file.csv_content) : { headers: [], rows: [] }, [file]);
  const nameKey = useMemo(() => findNameKey(table.headers), [table.headers]);
  const displayHeaders = useMemo(() => {
    const hiddenCommon = new Set(["teamname", "team"]);
    const hiddenByCategory: Record<string, Set<string>> = {
      batting: new Set(["battinghand"]),
      mvp: new Set(["playerrole", "role", "bowlingstyle", "battinghand"]),
    };
    const available = table.headers.filter((header) =>
      !isTechnicalId(header) &&
      !hiddenCommon.has(normalize(header)) &&
      !hiddenByCategory[category]?.has(normalize(header))
    );
    if (category !== "bowling") return available;
    const bowlingFields: Record<string, string[]> = {
      totalmatch: ["totalmatch", "totalmatches", "matches", "match", "total_match"],
      innings: ["innings"],
      totalwickets: ["totalwickets", "wickets", "wicket", "total_wickets"],
      highestwicket: ["highestwicket", "bestwickets", "bestwkt", "highest_wicket", "best_wickets", "highestwickets"],
      avg: ["avg", "average", "bowlingaverage", "bowling_avg"],
      runs: ["runs", "totalruns", "runs_conceded", "total_runs"],
      dotballs: ["dotballs", "dot_balls", "dotball", "dot_balls_count"],
    };
    const selected: string[] = [];
    for (const aliases of Object.values(bowlingFields)) {
      const match = available.find((header) => aliases.includes(normalize(header)));
      if (match) selected.push(match);
    }
    return selected;
  }, [table.headers, category]);
  const primaryKey = useMemo(() => {
    const candidates: Record<string, string[]> = {
      batting: ["total_runs", "runs", "totalruns", "run"],
      bowling: ["total_wickets", "wickets", "wicket", "totalwickets"],
      fielding: ["total_dismissal", "total_dismissals", "dismissals", "catches", "run_outs"],
      mvp: ["total", "mvp_points", "points", "total_points", "mvp"],
    };
    for (const candidate of candidates[category] ?? []) {
      const found = table.headers.find((header) => normalize(header) === normalize(candidate));
      if (found) return found;
    }
    return "";
  }, [table.headers, category]);
  const activeSortKey = table.headers.includes(sortKey) && !isTechnicalId(sortKey) ? sortKey : defaultSortKey(displayHeaders, category, table.rows);
  const sortedRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = table.rows.filter((row) => {
      if (primaryKey && isMissing(row[primaryKey])) return false;
      return !query || (nameKey ? row[nameKey] : Object.values(row).join(" ")).toLocaleLowerCase().includes(query);
    });
    return [...filtered].sort((a, b) => {
      const aValue = a[activeSortKey] ?? "";
      const bValue = b[activeSortKey] ?? "";
      const compare = isNumericColumn(table.rows, activeSortKey)
        ? numericValue(aValue) - numericValue(bValue)
        : aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: "base" });
      if (compare === 0 && nameKey) return (a[nameKey] ?? "").localeCompare(b[nameKey] ?? "", undefined, { numeric: true, sensitivity: "base" });
      return sortDirection === "desc" ? -compare : compare;
    });
  }, [table.rows, table.headers, activeSortKey, sortDirection, search, nameKey, primaryKey]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDirection((direction) => direction === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDirection("desc"); }
  }

  return (
    <main className="min-h-screen overflow-x-hidden site-page-surface text-slate-950">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <Link href="/tournaments/quadclash100" className="inline-flex items-center gap-2 rounded-lg border border-orange-400/40 bg-orange-500/10 px-4 py-2.5 text-sm font-extrabold text-orange-600 transition hover:border-orange-300 hover:bg-orange-500/20">← Back to QuadClash 100</Link>
      </div>
      <section className="border-b border-slate-200 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/15 via-slate-50 to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">Record books</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">QuadClash 100 <span className="text-orange-400">Stats</span></h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Explore player leaderboards across QuadClash 100 seasons.</p>
          <div className="mt-7 max-w-md">
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Choose season
              <select value={season} onChange={(event) => { setSeason(event.target.value); setSortKey(""); setSortDirection("desc"); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-semibold normal-case tracking-normal text-slate-950 outline-none focus:border-orange-400"><option value="1">Season 1</option><option value="2">Season 2</option></select>
            </label>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[{ label: "Seasons", value: "01" }, { label: "Current view", value: `Season ${season}` }, { label: "Players listed", value: loading ? "…" : sortedRows.length.toLocaleString("en-IN") }].map((item) => <div key={item.label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="text-sm text-slate-500">{item.label}</div><div className="mt-2 break-words text-xl font-extrabold sm:text-2xl">{item.value}</div></div>)}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">The record books</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Player Leaderboards</h2></div>
          <label className="block w-full sm:max-w-sm"><span className="sr-only">Search player</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search player…" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-500 focus:border-orange-400" /></label>
        </div>
          <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 sm:grid-cols-4">
            {[{ key: "batting", label: "Batting", icon: "🏏" }, { key: "bowling", label: "Bowling", icon: "🔴" }, { key: "fielding", label: "Fielding", icon: "🧤" }, { key: "mvp", label: "MVP", icon: "🏆" }].map((item) => <button key={item.key} onClick={() => { setCategory(item.key); setSortKey(""); setSortDirection("desc"); }} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-sm font-bold transition sm:text-base ${category === item.key ? "bg-orange-500 text-white shadow-lg shadow-orange-950/30" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`} aria-pressed={category === item.key}><span>{item.icon}</span>{item.label}</button>)}
          </div>
        {!loading && !error && sortedRows.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-3">{sortedRows.slice(0, 3).map((leader, index) => { const value = primaryKey ? leader[primaryKey] : leader[activeSortKey]; const label = primaryKey ? displayLabel(primaryKey) : displayLabel(activeSortKey); return <div key={`${leader[nameKey] ?? "player"}-${index}`} className={`relative min-w-0 overflow-hidden rounded-2xl border p-4 sm:p-5 ${index === 0 ? "border-orange-400/40 bg-gradient-to-br from-orange-100 to-white" : "border-slate-200 bg-white"}`}><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-widest text-slate-500">{index === 0 ? "Leading player" : `Rank ${index + 1}`}</span><span className="text-xl">{["🥇", "🥈", "🥉"][index]}</span></div><div className="mt-3 break-words text-lg font-extrabold">{nameKey ? leader[nameKey] || "Unknown player" : "Player record"}</div><div className="mt-4 flex items-baseline gap-2"><span className="text-3xl font-black text-orange-600">{formatValue(value ?? "")}</span><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span></div></div>})}</div>}
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-black/10">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5"><h3 className="font-bold">{category[0].toUpperCase() + category.slice(1)} leaderboard</h3><p className="mt-1 text-xs text-slate-500">Season {season} · {sortedRows.length.toLocaleString("en-IN")} players</p></div>
          {loading ? <div className="p-10 text-center text-slate-500">Loading season statistics…</div> : error ? <div role="alert" className="p-10 text-center text-red-700">{error}</div> : !file ? <div className="p-10 text-center text-slate-500">No {category} CSV has been uploaded for Season {season} yet. An administrator can upload it from Admin Dashboard → QuadClash 100.</div> : sortedRows.length === 0 ? <div className="p-10 text-center text-slate-500">No players found. Try another search.</div> : (
            <div className="divide-y divide-slate-200">
              {sortedRows.map((row, index) => {
                const playerName = nameKey ? row[nameKey] || "Unknown player" : "Player record";
                const rowId = `${row[nameKey] ?? "player"}-${index}`;
                const expanded = expandedPlayers.has(rowId);
                const mainLabel = category === "batting" ? "Runs" : category === "bowling" ? "Wickets" : category === "fielding" ? "Dismissals" : "MVP Points";
                const mainValue = primaryKey ? row[primaryKey] : row[activeSortKey];
                const detailHeaders = displayHeaders.filter((header) => header !== nameKey && header !== primaryKey);
                return <article key={rowId} className={`px-4 py-4 sm:px-5 ${index === 0 ? "bg-gradient-to-r from-emerald-50 to-transparent" : ""}`}>
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4"><span className="w-7 shrink-0 text-sm font-bold text-slate-500">{index + 1}</span><div className="min-w-0 flex-1"><h4 className="break-words text-base font-extrabold text-slate-950 sm:text-lg">{playerName}</h4></div><div className="shrink-0 text-right"><div className="text-2xl font-black text-orange-600 sm:text-3xl">{formatValue(mainValue ?? "")}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{mainLabel}</div></div></div>
                  <div className="mt-3 flex justify-end"><button type="button" aria-expanded={expanded} onClick={() => setExpandedPlayers((current) => { const next = new Set(current); if (next.has(rowId)) next.delete(rowId); else next.add(rowId); return next; })} className="rounded-lg border border-emerald-300/20 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-orange-300/50 hover:text-orange-600">Details <span className="ml-1 text-orange-400">{expanded ? "×" : "+"}</span></button></div>
                  {expanded && <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3 lg:grid-cols-4">{detailHeaders.map((header) => { const value = row[header]; return <div key={header} className="min-w-0 rounded-lg bg-slate-50 px-3 py-2"><div className="break-words text-[10px] font-semibold uppercase tracking-wider text-slate-500">{displayLabel(header)}</div><div className="mt-1 break-words text-sm font-bold tabular-nums text-slate-800">{formatValue(value ?? "")}</div></div>; })}</div>}
                </article>;
              })}
            </div>
          )}
        </section>
        <p className="mt-6 text-center text-xs leading-6 text-slate-500">QuadClash 100 · Celebrating the players, teams and moments behind every season.</p>
      </section>
    </main>
  );
}
