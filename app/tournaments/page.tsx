import Link from "next/link";
import Image from "next/image";
import { INTER_MOHALLA_ENABLED } from "@/lib/tournament-features";

const tournaments: {
  name: string;
  slug: string;
  logo: string | null;
  icon: string | null;
  description: string;
  featured?: boolean;
}[] = [
  {
    name: "Friendship Cup",
    slug: "/tournaments/friendshipcup",
    logo: "/friendship-cup-logo.png",
    icon: null,
    description:
      "Our flagship grassroots cricket tournament focused on friendship, competition and community.",
  },
  {
    name: "QuadClash 100",
    slug: "/tournaments/quadclash100",
    logo: "/quadclash100-logo.png",
    icon: null,
    description:
      "A fast-paced 100-ball cricket tournament built around excitement and competition.",
  },
  ...(INTER_MOHALLA_ENABLED ? [{
    name: "Inter Mohalla Tournament",
    slug: "/tournaments/inter-mohalla",
    logo: null,
    icon: "🏘️",
    description:
      "A new community cricket initiative bringing Mohallas together through the spirit of sport.",
    featured: true,
  }] : []),
];

export default function TournamentsPage() {
  return (
    <main className="min-h-screen site-page-surface px-4 py-8 sm:px-6 sm:py-12 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-orange-400/20 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-200 sm:text-sm">
              Mufaddal Husain Sports
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              Tournaments
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
              Explore the tournaments organized under Mufaddal Husain Sports.
            </p>
          </div>
        </header>

        <div className={`mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-6 ${tournaments.length > 2 ? "lg:grid-cols-3" : ""}`}>
          {tournaments.map((tournament) => (
            <Link
              href={tournament.slug}
              key={tournament.name}
              className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 motion-safe:hover:-translate-y-1 ${
                tournament.featured
                  ? "border-orange-300 ring-1 ring-orange-200"
                  : "border-slate-200 hover:border-blue-300"
              }`}
            >
              <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-orange-50 p-5 sm:p-6">
                {tournament.logo ? (
                  <Image
                    src={tournament.logo}
                    alt={`${tournament.name} logo`}
                    width={180}
                    height={180}
                    className="h-32 w-32 object-contain sm:h-36 sm:w-36"
                  />
                ) : (
                  <div className="grid h-32 w-32 place-items-center text-5xl sm:h-36 sm:w-36" aria-hidden="true">
                    {tournament.icon}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <h2 className="text-xl font-black text-slate-900 transition-colors group-hover:text-blue-800 sm:text-2xl">
                  {tournament.name}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 sm:text-base">
                  {tournament.description}
                </p>
                <span aria-hidden="true" className="mt-5 text-sm font-bold text-blue-800">Explore tournament <span className="inline-block transition-transform motion-safe:group-hover:translate-x-1">→</span></span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}