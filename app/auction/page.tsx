"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Tournament = { id: string; slug: string; name: string; status: string };

export default function AuctionsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/auctions", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load auctions.");
        if (active) setTournaments(result.tournaments);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load auctions."); });
    return () => { active = false; };
  }, []);
  return <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950 sm:px-8">
    <div className="mx-auto max-w-4xl">
      <Link href="/tournaments" className="text-sm font-bold text-orange-700">← MH Sports</Link>
      <h1 className="mt-4 text-3xl font-black">Live Auctions</h1>
      <p className="mt-2 text-slate-600">Follow live tournament auction boards and team points.</p>
      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
      <div className="mt-7 grid gap-4">{tournaments.length === 0 && !error ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">No public auctions are live yet.</p> : tournaments.map((item) => <Link key={item.id} href={`/auction/${item.slug}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-orange-300">
        <span><span className="block font-extrabold">{item.name}</span><span className="mt-1 block text-sm text-slate-500">View teams, player list, and auction status</span></span><span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase text-orange-800">{item.status}</span>
      </Link>)}</div>
    </div>
  </main>;
}
