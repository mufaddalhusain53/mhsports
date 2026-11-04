import Image from "next/image";
import Link from "next/link";
import TournamentLogo from "../../../components/TournamentLogo";

const teamLogos: Record<string, string> = {
  Strikers: "/quadclash100/logos/strikers.png",
  "Ezzi United XIII": "/quadclash100/logos/ezzi-united.png",
  Mavericks: "/quadclash100/logos/mavericks.png",
  "Multiplize Highlanders": "/quadclash100/logos/multiplize-highlanders.png",
};

function TeamBadge({ team, title }: { team: string; title: string }) {
  const logo = teamLogos[team];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</p>
      <div className="mt-4 flex items-center gap-4">
        {logo ? (
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-transparent p-2 shadow-none">
            <Image src={logo} alt={`${team} logo`} width={64} height={64} className="h-full w-full object-contain" />
          </div>
        ) : null}
        <h2 className="text-2xl font-black">{team}</h2>
      </div>
    </div>
  );
}

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
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-5">
                <TeamBadge team="Strikers" title="🏆 Champions" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <TeamBadge team="Multiplize Highlanders" title="🥈 Runner-up" />
              </div>
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
