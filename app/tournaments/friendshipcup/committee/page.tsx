import Image from "next/image";
import Link from "next/link";
import TournamentLogo from "../../../components/TournamentLogo";

export const metadata = { title: "Friendship Group Committee" };

const members = [
  { name: "Mufaddal Bookwala", description: "Founder of Friendship Group & Owner of Hakimi Nest" },
  { name: "Aliasgar Patanwala", description: "Owner of Ezzi Arts & Frames" },
  { name: "Murtaza Electricwala", description: "Owner of Sunmoon Electricals" },
  { name: "Siraj Rangwala", description: "Accountant" },
  { name: "Murtaza Palitanawala", description: "Owner of Apex Modulars" },
  { name: "Aliasgar Rangwala", description: "Owner of Vista Packaging" },
  { name: "Moayyad Mithaiwala", description: "Owner of Shabbir's Tawakkal" },
  { name: "Mustafa Masalawala", description: "Teacher by profession and guiding light for Friendship Group" },
];

export default function FriendshipCommitteePage() {
  return (
    <main className="min-h-screen site-page-surface px-4 py-8 text-slate-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/tournaments/friendshipcup" className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-bold text-orange-800 shadow-sm transition hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">
          <span aria-hidden="true">←</span> Back to Friendship Cup
        </Link>
        <header className="mt-5 flex flex-col items-center gap-5 rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-amber-900 p-6 text-center text-white shadow-xl sm:flex-row sm:p-8 sm:text-left">
          <TournamentLogo tournament="friendshipcup" className="h-28 w-28 shrink-0 sm:h-32 sm:w-32" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-200">Friendship Group</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Friendship Group Committee</h1>
            <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base">Know your committee members.</p>
          </div>
        </header>
        <section className="mt-8" aria-labelledby="committee-members">
          <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
            <Image
              src="/friendship-group-committee.jpeg"
              alt="Friendship Group Committee group photo"
              width={1152}
              height={768}
              sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1152px) calc(100vw - 48px), 1024px"
              className="h-auto w-full"
            />
          </div>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-8 w-1 rounded-full bg-orange-500" />
            <h2 id="committee-members" className="text-xl font-black sm:text-2xl">Know your committee members</h2>
          </div>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {members.map((member) => (
              <li key={member.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span aria-hidden="true" className="mb-4 block h-1 w-10 rounded-full bg-orange-400" />
                <h3 className="text-lg font-black text-slate-900">{member.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{member.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
