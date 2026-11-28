"use client";

import Image from "next/image";

type Standing = {
  team_id: string;
  team_name: string;
  logo: string;
  position: number;
  matches_played: number;
  won: number;
  lost: number;
  drawn: number;
  tied: number;
  no_result: number;
  points: number;
  net_run_rate: number;
};

// QuadClash 100 Season 1 is complete. These final standings are intentionally
// stored in the site so this page does not depend on Supabase or a sync function.
const rows: Standing[] = [
  { team_id: "strikers", team_name: "Strikers", logo: "/quadclash100/logos/strikers.png", position: 1, matches_played: 3, won: 3, lost: 0, drawn: 0, tied: 0, no_result: 0, points: 6, net_run_rate: 0.194 },
  { team_id: "multiplize-highlanders", team_name: "Multiplize Highlanders", logo: "/quadclash100/logos/multiplize-highlanders.png", position: 2, matches_played: 3, won: 2, lost: 1, drawn: 0, tied: 0, no_result: 0, points: 4, net_run_rate: 0.163 },
  { team_id: "ezzi-united-xiii", team_name: "Ezzi United XIII", logo: "/quadclash100/logos/ezzi-united.png", position: 3, matches_played: 3, won: 1, lost: 2, drawn: 0, tied: 0, no_result: 0, points: 2, net_run_rate: -0.028 },
  { team_id: "mavericks", team_name: "Mavericks", logo: "/quadclash100/logos/mavericks.png", position: 4, matches_played: 3, won: 0, lost: 3, drawn: 0, tied: 0, no_result: 0, points: 0, net_run_rate: -0.335 },
];

const fmt = (n: number) => Number(n ?? 0).toFixed(3);

export default function QuadClashPointsTableClient() {
  return (
    <div>
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 lg:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-200">
            <tr>{["Pos","Team","P","W","L","D/T","NR","Pts","NRR"].map(x => <th key={x} className="px-4 py-4">{x}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(row => <tr key={row.team_id} className="border-t border-slate-100 bg-white transition hover:bg-fuchsia-50/50">
              <td className="px-4 py-4 font-black text-fuchsia-700">{row.position}</td>
              <td className="px-4 py-4 font-semibold text-slate-950"><span className="flex items-center gap-3"><Image src={row.logo} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />{row.team_name}</span></td>
              <td className="px-4 py-4">{row.matches_played}</td><td className="px-4 py-4">{row.won}</td>
              <td className="px-4 py-4">{row.lost}</td><td className="px-4 py-4">{row.drawn + row.tied}</td>
              <td className="px-4 py-4">{row.no_result}</td><td className="px-4 py-4 font-black text-fuchsia-800">{row.points}</td>
              <td className="px-4 py-4">{fmt(row.net_run_rate)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {rows.map(row => (
          <article key={row.team_id} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fuchsia-100 text-sm font-extrabold text-fuchsia-800">{row.position}</div>
              <Image src={row.logo} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
              <h3 className="min-w-0 flex-1 break-words pt-1 text-base font-bold leading-5 text-slate-950">{row.team_name}</h3>
              <div className="shrink-0 text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Points</div>
                <div className="text-lg font-extrabold text-fuchsia-800">{row.points}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-4 border-t border-slate-200 pt-4">
              {[
                ["Played", row.matches_played],
                ["Won", row.won],
                ["Lost", row.lost],
                ["Drawn / Tied", row.drawn + row.tied],
                ["No Result", row.no_result],
                ["NRR", fmt(row.net_run_rate)],
              ].map(([label, value]) => (
                <div key={String(label)} className="min-w-0">
                  <div className="break-words text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
                  <div className="mt-1 break-words text-sm font-bold tabular-nums text-slate-700">{value}</div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
