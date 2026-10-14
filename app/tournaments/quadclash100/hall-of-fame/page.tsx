import Link from "next/link";

export default function HallOfFame() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/tournaments/quadclash100" className="inline-flex items-center gap-2 rounded-lg border border-orange-400/40 bg-orange-500/10 px-4 py-2.5 text-sm font-extrabold text-orange-300 transition hover:border-orange-300 hover:bg-orange-500/20">
          ← Back to QuadClash 100
        </Link>
        <p className="mt-8 text-xs font-black uppercase tracking-widest text-orange-400">
          Legacy of champions
        </p>
        <h1 className="mt-2 text-4xl font-black">QuadClash 100 Hall of Fame</h1>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-amber-400/40 bg-slate-900 p-6">
            <p className="text-xs font-black uppercase tracking-widest text-amber-300">Season 1</p>
            <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-5">
              <p className="text-xs font-black uppercase tracking-widest text-amber-300">🏆 Champions</p>
              <h2 className="mt-3 text-2xl font-black">Strikers</h2>
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-slate-800/70 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">🥈 Runner-up</p>
              <h2 className="mt-3 text-xl font-black">Multiplize Highlanders</h2>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <p className="text-xs font-black uppercase tracking-widest text-orange-400">Season 2</p>
            <div className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-slate-950/60 p-5 text-center">
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-amber-300">
                Coming Soon
              </span>
              <h2 className="mt-4 text-xl font-black">Season 2 Hall of Fame</h2>
              <p className="mt-2 text-sm text-slate-400">Champions and runner-up will be added after the tournament.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
