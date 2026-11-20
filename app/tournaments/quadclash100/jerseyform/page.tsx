import Link from "next/link";
import TournamentLogo from "../../../components/TournamentLogo";
import JerseyForm from "./jersey-form";

export const metadata = { title: "QC 100 Season 2 Jersey" };

export default function JerseyPage() {
  return <main className="min-h-screen site-page-surface px-4 py-10 text-slate-950">
    <div className="mx-auto max-w-3xl">
      <Link href="/tournaments/quadclash100" className="inline-flex items-center gap-2 rounded-lg border border-orange-400/40 bg-orange-500/10 px-4 py-2.5 text-sm font-extrabold text-orange-600">← Back to QuadClash 100</Link>
      <div className="mt-8"><TournamentLogo tournament="quadclash100" className="h-28 w-28 sm:h-36 sm:w-36" /></div>
      <h1 className="mt-4 text-4xl font-black sm:text-5xl">QC 100 Season 2 Jersey</h1>
      <JerseyForm />
    </div>
  </main>;
}
