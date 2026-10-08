import Link from "next/link";

const tournaments = [
  {
    name: "Friendship Cup",
    slug: "/tournaments/friendshipcup",
    icon: "🏏",
    description:
      "Our flagship grassroots cricket tournament focused on friendship, competition and community.",
    status: "Coming Soon",
  },
  {
    name: "Quad Clash 100",
    slug: "/tournaments/quadclash100",
    icon: "⚡",
    description:
      "A fast-paced 100-ball cricket tournament built around excitement and competition.",
    status: "Coming Soon",
  },
  {
    name: "Inter Mohalla Tournament",
    slug: "/tournaments/inter-mohalla",
    icon: "🏘️",
    description:
      "A new community cricket initiative bringing Mohallas together through the spirit of sport.",
    status: "Survey Open",
    featured: true,
  },
];

export default function TournamentsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 md:px-10">

      <div className="mx-auto max-w-7xl">

        <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">
          Mufaddal Husain Sports
        </p>

        <h1 className="mt-3 text-4xl font-black text-slate-900 md:text-5xl">
          Tournaments
        </h1>

        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Explore the tournaments organized under Mufaddal Husain Sports.
        </p>


        <div className="mt-12 grid gap-6 md:grid-cols-3">

          {tournaments.map((tournament) => (

            <Link
              href={tournament.slug}
              key={tournament.name}
              className={`rounded-2xl border bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                tournament.featured
                  ? "border-orange-300 ring-1 ring-orange-200"
                  : "border-slate-200"
              }`}
            >

              <div className="text-5xl">
                {tournament.icon}
              </div>

              <h2 className="mt-6 text-2xl font-black text-slate-900">
                {tournament.name}
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                {tournament.description}
              </p>

              <div className="mt-6 flex items-center justify-between">

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    tournament.status === "Coming Soon"
                      ? "bg-green-100 text-green-700"
                      : tournament.status === "Survey Open"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tournament.status}
                </span>

                <span className="font-bold text-orange-600">
                  Explore →
                </span>

              </div>

            </Link>

          ))}

        </div>

      </div>

    </main>
  );
}