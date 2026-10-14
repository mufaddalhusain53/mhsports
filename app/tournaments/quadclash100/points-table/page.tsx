import Link from "next/link";
import SectionShell from "../../friendshipcup/SectionShell";
import QuadClashPointsTableClient from "./PointsTableClient";

export const metadata = { title: "QuadClash 100 Season 1 Points Table | Mufaddal Husain Sports" };
const source = "https://cricheroes.com/tournament/1987117/quad-clash-100/point-table";

export default function QuadClashPointsTablePage() {
  return <SectionShell eyebrow="QUADCLASH 100" backHref="/tournaments/quadclash100" backLabel="Back to QuadClash 100" title="QuadClash 100 Season 1 Points Table" description="Season 1 league standings.">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div>
        <p className="font-semibold text-white">QuadClash 100 Season 1</p>
        <p className="mt-1 text-sm text-slate-400">Official source: CricHeroes · Tournament ID 1987117</p>
      </div>
      <Link href={source} target="_blank" rel="noreferrer" className="text-sm font-semibold text-orange-300 hover:text-orange-200">Open CricHeroes ↗</Link>
    </div>
    <QuadClashPointsTableClient />
  </SectionShell>;
}
