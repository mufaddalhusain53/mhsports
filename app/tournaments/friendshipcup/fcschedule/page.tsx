"use client";

import { useMemo, useState } from "react";
import SectionShell from "../SectionShell";

const weeks = [{"week": 1, "matches": [["Ezzi United", "ULCC", "Parsee Cyclist"], ["Multiplize Highlanders", "Shabbir Lions", "RTO"], ["Saifee Star", "Jolly Cricketers", "Sasanian"], ["Unix Star", "Vista Vikings", "Hindustan"]]}, {"week": 2, "matches": [["Ezzi United", "Vista Vikings", "Parsee Cyclist"], ["Jolly Cricketers", "Unix Star", "RTO"], ["Shabbir Lions", "Saifee Star", "Hindustan"], ["ULCC", "Multiplize Highlanders", "Sasanian"]]}, {"week": 3, "matches": [["Ezzi United", "Shabbir Lions", "Sasanian"], ["ULCC", "Jolly Cricketers", "Parsee Cyclist"], ["Multiplize Highlanders", "Vista Vikings", "RTO"], ["Saifee Star", "Unix Star", "Hindustan"]]}, {"week": 4, "matches": [["Ezzi United", "Jolly Cricketers", "Hindustan"], ["Shabbir Lions", "Vista Vikings", "Sasanian"], ["ULCC", "Unix Star", "RTO"], ["Multiplize Highlanders", "Saifee Star", "Parsee Cyclist"]]}, {"week": 5, "matches": [["Ezzi United", "Multiplize Highlanders", "Hindustan"], ["Saifee Star", "ULCC", "Sasanian"], ["Unix Star", "Shabbir Lions", "Parsee Cyclist"], ["Vista Vikings", "Jolly Cricketers", "RTO"]]}, {"week": 6, "matches": [["Ezzi United", "Unix Star", "Sasanian"], ["Vista Vikings", "Saifee Star", "Parsee Cyclist"], ["Jolly Cricketers", "Multiplize Highlanders", "Hindustan"], ["Shabbir Lions", "ULCC", "RTO"]]}, {"week": 7, "matches": [["Ezzi United", "Saifee Star", "RTO"], ["Unix Star", "Multiplize Highlanders", "Sasanian"], ["Vista Vikings", "ULCC", "Hindustan"], ["Jolly Cricketers", "Shabbir Lions", "Parsee Cyclist"]]}];

const teams = ["All Teams", "Ezzi United", "ULCC", "Multiplize Highlanders", "Shabbir Lions", "Saifee Star", "Jolly Cricketers", "Unix Star", "Vista Vikings"];


export default function SchedulePage() {
  const [weekFilter, setWeekFilter] = useState("All Weeks");
  const [teamFilter, setTeamFilter] = useState("All Teams");
  const matches = useMemo(() => weeks.flatMap((week) => week.matches.map(([home, away, pitch], index) => ({ week: week.week, match: index + 1, home, away, pitch })))
    .filter((match) => weekFilter === "All Weeks" || String(match.week) === weekFilter)
    .filter((match) => teamFilter === "All Teams" || match.home === teamFilter || match.away === teamFilter), [weekFilter, teamFilter]);
  return <SectionShell title="Season 7 Schedule" description="Browse the week-wise round-robin fixtures. Filter by week or team to quickly find a team's matches.">
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-bold text-slate-300">Week
        <select value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)} className="rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white">
          <option>All Weeks</option>{weeks.map((w) => <option key={w.week} value={String(w.week)}>Week {w.week}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-bold text-slate-300">Team
        <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white">
          {teams.map((team) => <option key={team}>{team}</option>)}
        </select>
      </label>
      <p className="text-sm text-slate-400 sm:col-span-2">Showing {matches.length} match{matches.length === 1 ? "" : "es"}{weekFilter !== "All Weeks" ? ` · Week ${weekFilter}` : ""}{teamFilter !== "All Teams" ? ` · ${teamFilter}` : ""}</p>
    </div>
    <div className="mt-6 space-y-8">
      {weeks.filter((w) => matches.some((m) => m.week === w.week)).map((week) => (
        <section key={week.week}>
          <h2 className="mb-3 flex items-center gap-3 text-xl font-extrabold"><span className="rounded-lg bg-orange-500 px-3 py-1 text-sm">WEEK {week.week}</span><span className="text-sm font-medium text-slate-400">{matches.filter((m) => m.week === week.week).length} matches</span></h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {matches.filter((m) => m.week === week.week).map((match) => (
              <article key={`${match.week}-${match.match}`} className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-orange-300">{match.match}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-lg font-extrabold">{match.home}</p><p className="my-1 text-xs font-black uppercase text-orange-400">vs</p><p className="truncate text-lg font-extrabold">{match.away}</p></div>
                  <div className="rounded-xl bg-emerald-900/40 px-4 py-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Pitch</p><p className="mt-1 whitespace-nowrap text-sm font-bold text-emerald-100">{match.pitch}</p></div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      {matches.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-slate-400">No matches found for these filters.</div>}
    </div>
  </SectionShell>;
}
