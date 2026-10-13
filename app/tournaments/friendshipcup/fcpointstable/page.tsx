import SectionShell from "../SectionShell";
import Link from "next/link";
import PointsTableClient from "./PointsTableClient";

export const metadata = { title: "Friendship Cup Points Table | Mufaddal Husain Sports" };

export default function PointsTablePage() {
  return <SectionShell title="Friendship Cup S7 Points Table" description="FC S7 league standings.">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div>
        <p className="font-semibold text-white">Friendship Cup Season 7</p>
        <p className="mt-1 text-sm text-slate-400">Official source: CricHeroes · Tournament ID 2206973</p>
      </div>
      <Link href="https://cricheroes.com/tournament/2206973/friendship-cup-s7/point-table" target="_blank" rel="noreferrer" className="text-sm font-semibold text-orange-300 hover:text-orange-200">Open CricHeroes ↗</Link>
    </div>
    <PointsTableClient />
  </SectionShell>;
}
