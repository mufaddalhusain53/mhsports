import Link from "next/link";
import TournamentLogo from "../../components/TournamentLogo";

const sections = [
  { href: "/tournaments/friendshipcup/fcstats", icon: "📊", title: "Friendship Cup Stats", description: "Explore batting, bowling and fielding records across all seasons." },
  { href: "/tournaments/friendshipcup/fcschedule", icon: "🗓️", title: "Season Schedule", description: "View the Season 7 week-wise fixture schedule and pitches." },
  { href: "/tournaments/friendshipcup/fcpointstable", icon: "🏆", title: "Current Season Points Table", description: "Follow the league standings for the current season." },
  { href: "/tournaments/friendshipcup/fchalloffame", icon: "👑", title: "Hall of Fame", description: "Celebrate Friendship Cup champions and runners-up." },
  { href: "/tournaments/friendshipcup/committee", icon: "🤝", title: "Friendship Group Committee", description: "Know your committee members." },
];

export const metadata = {
  title: { absolute: "Friendship Cup" },
  description: "Friendship Cup hub: stats, schedule, points table, hall of fame and gallery.",
};

export default function FriendshipCupPage() {
  return (
    <main className="min-h-screen site-page-surface px-4 py-8 text-slate-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-blue-950 to-amber-900 p-6 text-white shadow-xl sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-orange-400/20 blur-3xl" />
          <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-8 sm:text-left">
            <TournamentLogo tournament="friendshipcup" className="h-36 w-36 shrink-0 sm:h-44 sm:w-44" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-200">Tournament hub</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Friendship Cup</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">Your home for every season — records, fixtures, standings, champions and memories.</p>
            </div>
          </div>
        </header>
        <section className="mt-8 sm:mt-10" aria-labelledby="friendship-explore">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-8 w-1 rounded-full bg-orange-500" />
            <h2 id="friendship-explore" className="text-xl font-black sm:text-2xl">Explore Friendship Cup</h2>
          </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((item) => (
            <Link key={item.href} href={item.href} className="group flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 motion-safe:hover:-translate-y-1">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-orange-50 text-2xl" aria-hidden="true">{item.icon}</span>
              <h3 className="mt-4 text-lg font-extrabold">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{item.description}</p>
              <span aria-hidden="true" className="mt-4 text-sm font-bold text-orange-700">Explore →</span>
            </Link>
          ))}
        </div>
        </section>
      </div>
    </main>
  );
}
