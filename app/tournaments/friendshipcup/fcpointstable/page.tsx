import SectionShell from "../SectionShell";
import Link from "next/link";
import PointsTableClient from "./PointsTableClient";

export const metadata = { title: "Friendship Cup Points Table" };

export default function PointsTablePage() {
  return <SectionShell title="Season 7 Points Table" description="Friendship Cup Season 7 league standings.">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="font-semibold text-slate-950">Friendship Cup Season 7</p>
        <p className="mt-1 text-sm text-slate-500">Official source: CricHeroes · Tournament ID 2206973</p>
      </div>
      <Link href="https://cricheroes.com/tournament/2206973/friendship-cup-s7/point-table" target="_blank" rel="noreferrer" className="text-sm font-semibold text-orange-600 hover:text-orange-700">Open CricHeroes ↗</Link>
    </div>
    <PointsTableClient />
  </SectionShell>;
}
