import Image from "next/image";
import Link from "next/link";

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
          <Image
            src="/friendship-group-logo.png"
            alt="Friendship Group logo"
            width={768}
            height={774}
            sizes="(max-width: 640px) 112px, 128px"
            className="h-28 w-28 shrink-0 rounded-2xl object-contain sm:h-32 sm:w-32"
          />
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Friendship Group Committee</h1>
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
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-amber-900 p-6 text-white shadow-lg sm:p-8">
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-48 w-48 rounded-full bg-orange-400/20 blur-3xl" />
            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-orange-200">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-orange-300" /> Meet the team
              </p>
              <h2 id="committee-members" className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Know your committee members</h2>
              <p className="mt-2 text-sm leading-6 text-slate-200">The people behind Friendship Group.</p>
            </div>
          </div>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {members.map((member) => (
              <li key={member.name} className="relative flex min-w-0 items-start gap-4 overflow-hidden rounded-2xl border border-orange-100 bg-white p-5 shadow-md shadow-slate-900/5 sm:p-6">
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-transparent" />
                <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-950 to-slate-800 text-base font-black text-orange-200 shadow-md">
                  {member.name.split(" ").map((part) => part[0]).join("")}
                </span>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-lg font-black leading-snug text-slate-900">{member.name}</h3>
                  <p className="mt-2 border-t border-orange-100 pt-2 text-sm leading-6 text-slate-600">{member.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
