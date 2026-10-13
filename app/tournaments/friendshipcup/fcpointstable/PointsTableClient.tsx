"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Standing = {
  team_id: string; team_name: string; position: number; matches_played: number;
  won: number; lost: number; drawn: number; tied: number; no_result: number;
  points: number; net_run_rate: number; runs_for: string | null;
  runs_against: string | null; last_five: string | null; synced_at: string;
};

const TOURNAMENT_KEY = "friendship-cup-s7";
const fmt = (n: number) => Number(n ?? 0).toFixed(2);

export default function PointsTableClient() {
  const [rows, setRows] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("fc_points_standings")
      .select("*")
      .eq("tournament_key", TOURNAMENT_KEY)
      .order("position", { ascending: true });
    if (queryError) {
      setError("Unable to load the cached standings. Apply the Supabase SQL migration and check the public environment variables.");
      return;
    }
    setRows((data ?? []) as Standing[]);
    setError("");
  }, []);

  useEffect(() => { void load().finally(() => setLoading(false)); }, [load]);


  return (
    <div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400">
            <tr>{["Pos","Team","P","W","L","D","NR","Pts","NRR"].map(x => <th key={x} className="px-4 py-4">{x}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">Loading cached standings…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No standings have synced yet. Please check back later.</td></tr>
              : rows.map(row => <tr key={row.team_id} className="border-t border-white/10 hover:bg-white/[0.03]">
                <td className="px-4 py-4 font-bold text-orange-300">{row.position}</td>
                <td className="px-4 py-4 font-semibold text-white">{row.team_name}</td>
                <td className="px-4 py-4">{row.matches_played}</td><td className="px-4 py-4">{row.won}</td>
                <td className="px-4 py-4">{row.lost}</td><td className="px-4 py-4">{row.drawn + row.tied}</td>
                <td className="px-4 py-4">{row.no_result}</td><td className="px-4 py-4 font-bold">{row.points}</td>
                <td className="px-4 py-4">{fmt(row.net_run_rate)}</td>
              </tr>)}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}
