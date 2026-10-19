import Link from "next/link";
import TournamentLogo from "../../components/TournamentLogo";

const sections = [
  { href: "/tournaments/friendshipcup/fcstats", icon: "📊", title: "Friendship Cup Stats", description: "Explore batting, bowling and fielding records across all seasons." },
  { href: "/tournaments/friendshipcup/fcschedule", icon: "🗓️", title: "Season Schedule", description: "View the Season 7 week-wise fixture schedule and pitches." },
  { href: "/tournaments/friendshipcup/fcpointstable", icon: "🏆", title: "Current Season Points Table", description: "Follow the league standings for the current season." },
  { href: "/tournaments/friendshipcup/fchalloffame", icon: "👑", title: "Hall of Fame", description: "Celebrate Friendship Cup champions and runners-up." },
];

export const metadata = {
  title: "Friendship Cup",
  description: "Friendship Cup hub: stats, schedule, points table, hall of fame and gallery.",
};

export default function FriendshipCupPage() {
  return (
    <main className="min-h-screen site-page-surface px-5 py-12 text-slate-950 sm:px-8 md:py-16">
      <div className="mx-auto max-w-7xl">
        <h1 className="sr-only">Friendship Cup</h1>
        <TournamentLogo tournament="friendshipcup" className="h-40 w-40 sm:h-48 sm:w-48" />
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Your home for every season — records, fixtures, standings, champions and memories.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((item) => (
            <Link key={item.href} href={item.href} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-400/60 hover:shadow-md">
              <div className="text-4xl" aria-hidden="true">{item.icon}</div>
              <h2 className="mt-5 text-xl font-extrabold">{item.title}</h2>
              <p className="mt-2 min-h-14 text-sm leading-6 text-slate-600">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
