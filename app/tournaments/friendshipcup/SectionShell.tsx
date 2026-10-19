import Link from "next/link";
import type { ReactNode } from "react";
import TournamentLogo from "../../components/TournamentLogo";

export default function SectionShell({ eyebrow = "FRIENDSHIP CUP", title, description, children, backHref = "/tournaments/friendshipcup", backLabel = "Back to Friendship Cup", tournament = "friendshipcup" }: { eyebrow?: string; title: string; description: string; children: ReactNode; backHref?: string; backLabel?: string; tournament?: "friendshipcup" | "quadclash100" }) {
  return <main className="min-h-screen site-page-surface px-5 py-10 text-slate-950 sm:px-8 md:py-14">
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <Link href={backHref} className="inline-flex items-center gap-2 rounded-lg border border-orange-400/40 bg-orange-500/10 px-4 py-2.5 text-sm font-extrabold text-orange-600 transition hover:border-orange-300 hover:bg-orange-500/20">
          <span aria-hidden="true">←</span> {backLabel}
        </Link>
      </div>
      <div className="mt-8">
        <TournamentLogo tournament={tournament} className="h-28 w-28 sm:h-36 sm:w-36" />
        {eyebrow && <p className="sr-only">{eyebrow}</p>}
      </div>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">{title}</h1>
      <p className="sr-only">{description}</p>
      <div className="mt-8">{children}</div>
    </div>
  </main>;
}
