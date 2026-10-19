import Link from "next/link";
import { isAdminAuthenticated } from "../../lib/admin/auth";
import AdminLogin from "./admin-login";
import AdminLogoutButton from "./admin-logout-button";

export const instant = false;

const adminPages = [
  {
    tournament: "Friendship Cup",
    sections: [
      {
        title: "Leaderboard Update",
        description: "Refresh the points table or upload season leaderboard data.",
        href: "/admin/friendship-cup/leaderboard",
      },
    ],
  },
  {
    tournament: "QuadClash 100",
    sections: [
      {
        title: "Leaderboard Update",
        description: "Upload batting, bowling, fielding, and MVP stats.",
        href: "/admin/quadclash100/leaderboard",
      },
      {
        title: "Player Registration Management",
        description: "Open or close registration and manage player entries.",
        href: "/admin/quadclash100/player-registration",
      },
    ],
  },
  {
    tournament: "Mohalla Tournament",
    sections: [
      {
        title: "Player Survey Management",
        description: "Search, filter, and export player survey responses.",
        href: "/admin/mohalla/survey",
      },
    ],
  },
];

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    return <AdminLogin />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-orange-500">
              Mufaddal Husain Sports
            </p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-slate-600">
              Choose a tournament and the admin section you want to manage.
            </p>
          </div>
          <AdminLogoutButton />
        </header>

        <div className="mt-8 grid gap-6">
          {adminPages.map((page) => (
            <section
              key={page.tournament}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-black text-slate-900">
                {page.tournament}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {page.sections.map((section) => (
                  <Link
                    key={section.href}
                    href={section.href}
                    className="rounded-xl border border-slate-200 p-5 transition hover:border-orange-300 hover:bg-orange-50"
                  >
                    <h3 className="font-extrabold text-slate-900">
                      {section.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {section.description}
                    </p>
                    <span className="mt-4 inline-block text-sm font-bold text-orange-700">
                      Open section →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
