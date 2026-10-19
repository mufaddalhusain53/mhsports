import Link from "next/link";
import TournamentLogo from "../../../components/TournamentLogo";

export default function HallOfFame() {
  return (
    <main className="min-h-screen site-page-surface px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <Link href="/tournaments/quadclash100" className="inline-flex items-center gap-2 rounded-lg border border-orange-400/40 bg-orange-500/10 px-4 py-2.5 text-sm font-extrabold text-orange-600 transition hover:border-orange-300 hover:bg-orange-500/20">
          ← Back to QuadClash 100
        </Link>
        <div className="mt-8">
          <TournamentLogo tournament="quadclash100" className="h-28 w-28 sm:h-36 sm:w-36" />
        </div>
        <p className="mt-8 text-xs font-black uppercase tracking-widest text-orange-400">
          Legacy of champions
        </p>
        <h1 className="mt-2 text-4xl font-black">Hall of Fame</h1>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-amber-400/40 bg-white p-6">
            <p className="text-xs font-black uppercase tracking-widest text-amber-700">Season 1</p>
            <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-5">
              <p className="text-xs font-black uppercase tracking-widest text-amber-700">🏆 Champions</p>
              <h2 className="mt-3 text-2xl font-black">Strikers</h2>
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">🥈 Runner-up</p>
              <h2 className="mt-3 text-xl font-black">Multiplize Highlanders</h2>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-black uppercase tracking-widest text-orange-400">Season 2</p>
            <div className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-amber-700">
                Coming Soon
              </span>
              <h2 className="mt-4 text-xl font-black">Season 2 Hall of Fame</h2>
              <p className="mt-2 text-sm text-slate-500">Champions and runner-up will be added after the tournament.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
