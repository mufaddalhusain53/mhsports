import Link from "next/link";

const sections = [
  { href: "/tournaments/friendshipcup/fcstats", icon: "📊", title: "Friendship Cup Stats", description: "Explore batting, bowling and fielding records across all seasons." },
  { href: "/tournaments/friendshipcup/fcschedule", icon: "🗓️", title: "Season Schedule", description: "View the Season 7 week-wise fixture schedule and pitches." },
  { href: "/tournaments/friendshipcup/fcpointstable", icon: "🏆", title: "Current Season Points Table", description: "Follow the league standings for the current season." },
  { href: "/tournaments/friendshipcup/fchalloffame", icon: "👑", title: "Hall of Fame", description: "Celebrate Friendship Cup champions and runners-up." },
];

export const metadata = {
  title: "Friendship Cup | Mufaddal Husain Sports",
  description: "Friendship Cup hub: stats, schedule, points table, hall of fame and gallery.",
};

export default function FriendshipCupPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-white sm:px-8 md:py-16">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-400">Mufaddal Husain Sports</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Friendship Cup</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">Your home for every season — records, fixtures, standings, champions and memories.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((item) => (
            <Link key={item.href} href={item.href} className="group rounded-2xl border border-white/10 bg-slate-900/80 p-6 transition hover:-translate-y-1 hover:border-orange-400/60 hover:bg-slate-900">
              <div className="text-4xl" aria-hidden="true">{item.icon}</div>
              <h2 className="mt-5 text-xl font-extrabold">{item.title}</h2>
              <p className="mt-2 min-h-14 text-sm leading-6 text-slate-400">{item.description}</p>
              <span className="mt-5 inline-flex font-bold text-orange-400 group-hover:text-orange-300">Explore <span className="ml-2">→</span></span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
