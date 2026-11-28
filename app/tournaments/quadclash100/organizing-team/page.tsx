import Image from "next/image";
import Link from "next/link";
import TournamentLogo from "../../../components/TournamentLogo";

export const metadata = { title: "QuadClash 100 Organizing Team" };

const organizingTeam = [
  "Mufaddal Bookwala",
  "Mohsin Pocketwala",
  "Taqui Latify",
  "Aliasgar Patanwala",
  "Husain Furniturewala",
  "Yusuf Sehorewala",
  "Mohsin Patrawala",
];

export default function OrganizingTeamPage() {
  return (
    <main className="min-h-screen site-page-surface px-4 py-8 text-slate-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link href="/tournaments/quadclash100" className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-white px-4 py-2 text-sm font-bold text-fuchsia-800 shadow-sm transition hover:bg-fuchsia-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-700">
          <span aria-hidden="true">←</span> Back to QuadClash 100
        </Link>
        <header className="mt-5 flex flex-col items-center gap-5 rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 p-6 text-center text-white shadow-xl sm:flex-row sm:p-8 sm:text-left">
          <TournamentLogo tournament="quadclash100" className="h-28 w-28 shrink-0 sm:h-32 sm:w-32" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">QuadClash 100</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Organizing Team</h1>
            <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base">Meet the team behind QuadClash 100.</p>
          </div>
        </header>
        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5" aria-labelledby="organizing-members">
          <Image
            src="/quadclash100/organizing-team.jpeg"
            alt="Group photo at a QuadClash 100 event"
            width={1152}
            height={768}
            sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) calc(100vw - 48px), 896px"
            className="h-auto w-full"
          />
          <div className="p-5 sm:p-7">
            <h2 id="organizing-members" className="text-xl font-black">Know your organizing team</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {organizingTeam.map((name) => (
                <li key={name} className="rounded-xl border border-fuchsia-100 bg-fuchsia-50/60 px-4 py-3 text-sm font-bold text-slate-800">{name}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
