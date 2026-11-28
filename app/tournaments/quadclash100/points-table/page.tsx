import Link from "next/link";
import TournamentLogo from "../../../components/TournamentLogo";
import QuadClashPointsTableClient from "./PointsTableClient";

const source = "https://cricheroes.com/tournament/1987117/quad-clash-100/point-table";

export default function QuadClashPointsTablePage() {
  return (
    <main className="min-h-screen site-page-surface px-4 py-8 text-slate-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <Link href="/tournaments/quadclash100" className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-white px-4 py-2 text-sm font-bold text-fuchsia-800 shadow-sm transition hover:bg-fuchsia-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-700">
          <span aria-hidden="true">←</span> Back to QuadClash 100
        </Link>
        <header className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 p-6 text-white shadow-xl sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-8 sm:text-left">
            <TournamentLogo tournament="quadclash100" className="h-28 w-28 shrink-0 sm:h-36 sm:w-36" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">Season standings</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">QuadClash 100 Points Table</h1>
              <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base">Follow the standings across QuadClash 100 seasons.</p>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-6" aria-labelledby="season-one">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-fuchsia-700">Final standings</p>
              <h2 id="season-one" className="mt-1 text-2xl font-black">Season 1</h2>
              <p className="mt-1 text-sm text-slate-500">Official source: CricHeroes · Tournament ID 1987117</p>
            </div>
            <Link href={source} target="_blank" rel="noreferrer" className="rounded-full border border-fuchsia-200 px-4 py-2 text-sm font-bold text-fuchsia-800 transition hover:bg-fuchsia-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-700">Open CricHeroes ↗</Link>
          </div>
          <QuadClashPointsTableClient />
        </section>

        <section className="mt-6 rounded-3xl border border-fuchsia-100 bg-white p-5 shadow-lg shadow-slate-900/5 sm:p-6" aria-labelledby="season-two">
          <p className="text-xs font-black uppercase tracking-widest text-fuchsia-700">Coming up</p>
          <h2 id="season-two" className="mt-1 text-2xl font-black">Season 2</h2>
          <div className="mt-4 rounded-2xl border border-fuchsia-100 bg-fuchsia-50 px-5 py-5">
            <p className="font-bold text-fuchsia-950">Season 2 begins on 20 March 2027.</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Standings will be available once the season begins.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
