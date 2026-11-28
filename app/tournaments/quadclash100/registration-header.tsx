import Link from "next/link";
import TournamentLogo from "../../components/TournamentLogo";

export default function RegistrationHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <Link
        href="/tournaments/quadclash100"
        className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-white px-4 py-2 text-sm font-bold text-fuchsia-800 shadow-sm transition hover:border-fuchsia-400 hover:bg-fuchsia-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-700"
      >
        <span aria-hidden="true">←</span> Back to QuadClash 100
      </Link>
      <header className="relative mt-5 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 p-6 text-white shadow-xl sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-7 sm:text-left">
          <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 p-2">
            <TournamentLogo tournament="quadclash100" className="h-24 w-24 sm:h-32 sm:w-32" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">QuadClash 100 · Season 2</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">{description}</p>
          </div>
        </div>
      </header>
    </>
  );
}
