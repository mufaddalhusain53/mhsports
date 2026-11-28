import Link from "next/link";
import TournamentLogo from "../../components/TournamentLogo";

const announcements = [
  "QuadClash 100 Season 2 · 20, 21 and 22 March 2027",
  "QuadClash 100 Season 2 Registration begins on 5 December 2026",
  "QuadClash 100 Season 2 Players Auction on 20 January 2027",
];

const items = [
  { href: "/tournaments/quadclash100/stats", icon: "📊", title: "QuadClash 100 Stats", desc: "Season-wise batting, bowling, fielding and MVP leaderboards." },
  { href: "/tournaments/quadclash100/points-table", icon: "🏆", title: "QuadClash 100 Points Table", desc: "Explore season-wise league standings." },
  { href: "/tournaments/quadclash100/teams", icon: "👥", title: "QuadClash 100 Teams", desc: "Choose a season and explore team squads and player details." },
  { href: "/tournaments/quadclash100/registration", icon: "📝", title: "Season 2 Player Registration", desc: "Registration announcement and updates." },
  { href: "/tournaments/quadclash100/jerseyform", icon: "👕", title: "QC 100 Season 2 Jersey", desc: "Submit your jersey size and sleeve preferences." },
  { href: "/tournaments/quadclash100/sponsors", icon: "🤝", title: "QuadClash 100 Sponsors", desc: "Tournament sponsors and franchise sponsors." },
  { href: "/tournaments/quadclash100/hall-of-fame", icon: "👑", title: "QuadClash 100 Hall of Fame", desc: "Champions, runners-up and tournament legacy." },
  { href: "/tournaments/quadclash100/organizing-team", icon: "🤝", title: "QuadClash 100 Organizing Team", desc: "Meet the team behind QuadClash 100." },
];

export default function QuadClashPage() {
  return (
    <main className="min-h-screen site-page-surface px-4 py-8 text-slate-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 p-6 text-white shadow-xl sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-fuchsia-500/15 blur-3xl" />
          <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-8 sm:text-left">
            <TournamentLogo tournament="quadclash100" className="h-36 w-36 shrink-0 sm:h-44 sm:w-44" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">Tournament hub</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">QuadClash 100</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">Everything for QuadClash 100 — stats, standings, teams, sponsors and champions.</p>
            </div>
          </div>
        </header>

        <div className="mt-6 flex overflow-hidden rounded-2xl border border-fuchsia-200 bg-white shadow-sm" aria-label="Tournament news">
          <style>{`
            @media (prefers-reduced-motion: reduce) {
              .quadclash-news .sponsor-strip-track { width: 100%; min-width: 0; }
              .quadclash-news .sponsor-strip-group:not(.sponsor-strip-duplicate) { display: block; min-width: 0; flex: 1 1 100%; }
              .quadclash-news .news-item { display: block; white-space: normal; }
              .quadclash-news .news-separator { display: none; }
            }
          `}</style>
          <span className="z-10 flex shrink-0 items-center bg-fuchsia-800 px-4 py-3 text-xs font-black uppercase tracking-wider text-white">News</span>
          <div className="sponsor-strip quadclash-news min-w-0 flex-1" role="region" aria-label="Season 2 announcements" tabIndex={0}>
            <div className="sponsor-strip-track">
              {[false, true].map((duplicate) => (
                <div key={String(duplicate)} className={`sponsor-strip-group px-5 py-3 text-sm font-bold text-fuchsia-900 ${duplicate ? "sponsor-strip-duplicate" : ""}`} aria-hidden={duplicate || undefined}>
                  {announcements.map((announcement) => (
                    <span key={announcement} className="news-item mr-8 whitespace-nowrap">
                      {announcement}<span aria-hidden="true" className="news-separator ml-8 text-fuchsia-500">★</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="mt-8 sm:mt-10" aria-labelledby="explore-heading">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-8 w-1 rounded-full bg-fuchsia-600" />
            <h2 id="explore-heading" className="text-xl font-black text-slate-900 sm:text-2xl">Explore QuadClash 100</h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className="group flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-fuchsia-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-700 motion-safe:hover:-translate-y-1">
                <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-xl bg-fuchsia-50 text-2xl">{item.icon}</span>
                <h3 className="mt-4 text-lg font-extrabold text-slate-900 transition-colors group-hover:text-fuchsia-700">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{item.desc}</p>
                <span aria-hidden="true" className="mt-4 text-sm font-bold text-fuchsia-700">Explore <span className="inline-block transition-transform motion-safe:group-hover:translate-x-1">→</span></span>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
