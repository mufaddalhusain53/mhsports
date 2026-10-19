import Link from "next/link";
import SectionShell from "../../friendshipcup/SectionShell";
import QuadClashPointsTableClient from "./PointsTableClient";

export const metadata = { title: "QuadClash 100 Season 1 Points Table" };
const source = "https://cricheroes.com/tournament/1987117/quad-clash-100/point-table";

export default function QuadClashPointsTablePage() {
  return <SectionShell eyebrow="QUADCLASH 100" tournament="quadclash100" backHref="/tournaments/quadclash100" backLabel="Back to QuadClash 100" title="Season 1 Points Table" description="Season 1 league standings.">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="font-semibold text-slate-950">QuadClash 100 Season 1</p>
        <p className="mt-1 text-sm text-slate-500">Official source: CricHeroes · Tournament ID 1987117</p>
      </div>
      <Link href={source} target="_blank" rel="noreferrer" className="text-sm font-semibold text-orange-600 hover:text-orange-700">Open CricHeroes ↗</Link>
    </div>
    <QuadClashPointsTableClient />
  </SectionShell>;
}
