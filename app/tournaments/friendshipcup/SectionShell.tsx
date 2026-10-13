import Link from "next/link";
import type { ReactNode } from "react";

export default function SectionShell({ eyebrow = "FRIENDSHIP CUP", title, description, children }: { eyebrow?: string; title: string; description: string; children: ReactNode }) {
  return <main className="min-h-screen bg-slate-950 px-5 py-10 text-white sm:px-8 md:py-14">
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <Link href="/tournaments/friendshipcup" className="inline-flex items-center gap-2 rounded-lg border border-orange-400/40 bg-orange-500/10 px-4 py-2.5 text-sm font-extrabold text-orange-300 transition hover:border-orange-300 hover:bg-orange-500/20">
          <span aria-hidden="true">←</span> Back to Friendship Cup Dashboard
        </Link>
      </div>
      <p className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-orange-400">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-400">{description}</p>
      <div className="mt-8">{children}</div>
    </div>
  </main>;
}
