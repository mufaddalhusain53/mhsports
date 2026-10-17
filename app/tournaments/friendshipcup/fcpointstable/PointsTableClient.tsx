"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Standing = {
  team_id: string; team_name: string; position: number; matches_played: number;
  won: number; lost: number; drawn: number; tied: number; no_result: number;
  points: number; net_run_rate: number; runs_for: string | null;
  runs_against: string | null; last_five: string | null; synced_at: string;
};

const TOURNAMENT_KEY = "friendship-cup-s7";
const fmt = (n: number) => Number(n ?? 0).toFixed(3);

export default function PointsTableClient() {
  const [rows, setRows] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("fc_points_standings")
      .select("*")
      .eq("tournament_key", TOURNAMENT_KEY)
      .order("position", { ascending: true })
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        if (queryError) {
          setError("Unable to load the cached standings. Apply the Supabase SQL migration and check the public environment variables.");
        } else {
          setRows((data ?? []) as Standing[]);
          setError("");
        }
        setLoading(false);
      }, (queryError: unknown) => {
        console.error("Could not load Friendship Cup standings:", queryError);
        if (!cancelled) {
          setError("Unable to load the cached standings. Check the public environment variables and try again.");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
      {/* Desktop: full standings table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-white text-xs uppercase tracking-wider text-slate-500">
            <tr>{["Pos","Team","M","W","L","D","T","NR","NRR","For","Against","Pts","Last 5"].map(x => <th key={x} className="px-4 py-4">{x}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={13} className="px-4 py-10 text-center text-slate-500">Loading cached standings…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={13} className="px-4 py-10 text-center text-slate-500">No standings have synced yet. Please check back later.</td></tr>
              : rows.map(row => <tr key={row.team_id} className="border-t border-slate-200 hover:bg-white/[0.03]">
                <td className="px-4 py-4 font-bold text-orange-600">{row.position}</td>
                <td className="px-4 py-4 font-semibold text-slate-950">{row.team_name}</td>
                <td className="px-4 py-4">{row.matches_played}</td><td className="px-4 py-4">{row.won}</td>
                <td className="px-4 py-4">{row.lost}</td><td className="px-4 py-4">{row.drawn}</td>
                <td className="px-4 py-4">{row.tied}</td><td className="px-4 py-4">{row.no_result}</td>
                <td className="px-4 py-4">{fmt(row.net_run_rate)}</td>
                <td className="px-4 py-4">{row.runs_for ?? "—"}</td><td className="px-4 py-4">{row.runs_against ?? "—"}</td>
                <td className="px-4 py-4 font-bold">{row.points}</td><td className="px-4 py-4">{row.last_five ?? "—"}</td>
              </tr>)}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards include every standings field, with no sideways scrolling */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 px-4 py-10 text-center text-sm text-slate-500">Loading cached standings…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 px-4 py-10 text-center text-sm text-slate-500">No standings have synced yet. Please check back later.</div>
        ) : rows.map(row => (
          <article key={row.team_id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-400/10 text-sm font-extrabold text-orange-600">{row.position}</div>
              <h3 className="min-w-0 flex-1 break-words pt-1 text-base font-bold leading-5 text-slate-950">{row.team_name}</h3>
              <div className="shrink-0 text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Points</div>
                <div className="text-lg font-extrabold text-orange-600">{row.points}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-slate-200 pt-4">
              {[
                ["Played", row.matches_played],
                ["Won", row.won],
                ["Lost", row.lost],
                ["Drawn", row.drawn],
                ["Tied", row.tied],
                ["No Result", row.no_result],
                ["NRR", fmt(row.net_run_rate)],
                ["For", row.runs_for ?? "—"],
                ["Against", row.runs_against ?? "—"],
                ["Last 5", row.last_five ?? "—"],
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
