import Image from "next/image";
import Link from "next/link";
import TournamentLogo from "./components/TournamentLogo";

export default function Home() {
  return (
    <main className="min-h-screen site-page-surface px-4 py-8 text-slate-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-sky-900 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14 lg:px-14">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto] lg:gap-16">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-200 sm:text-sm">Mufaddal Husain Sports</p>
              <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Building Champions.<br /><span className="text-cyan-200">Creating Communities.</span>
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-200 sm:text-lg">
                A community-driven sports platform bringing together tournaments, players and cricket enthusiasts.
              </p>
              <Link href="/tournaments" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                Explore Tournaments <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="hidden rounded-3xl border border-white/15 bg-white/10 p-6 shadow-xl lg:block">
              <Image src="/mhsports-logo.png" alt="Mufaddal Husain Sports logo" width={210} height={210} className="h-48 w-48 rounded-2xl bg-white object-contain p-2" />
              <p className="mt-4 text-center text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Community · Cricket · Competition</p>
            </div>
          </div>
        </section>

        <section className="mt-8 sm:mt-10" aria-labelledby="home-tournaments">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Find your tournament</p>
          <h2 id="home-tournaments" className="mt-2 text-2xl font-black sm:text-3xl">Cricket brings us together</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {([
              { tournament: "friendshipcup", title: "Friendship Cup", description: "Friendship, community and cricket across the seasons." },
              { tournament: "quadclash100", title: "QuadClash 100", description: "Fast-paced cricket and competitive tournament action." },
            ] as const).map((item) => (
              <Link key={item.tournament} href={`/tournaments/${item.tournament}`} className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:p-5">
                <span className="grid shrink-0 place-items-center rounded-xl bg-slate-50 p-2"><TournamentLogo tournament={item.tournament} className="h-16 w-16 sm:h-20 sm:w-20" /></span>
                <span className="min-w-0">
                  <span className="block text-lg font-black text-slate-900">{item.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">{item.description}</span>
                  <span className="mt-2 block text-sm font-bold text-blue-700">Explore <span aria-hidden="true">→</span></span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
