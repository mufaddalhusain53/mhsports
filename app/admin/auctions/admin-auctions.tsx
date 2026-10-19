"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Tournament = { id: string; slug: string; name: string; status: string; created_at: string };

export default function AdminAuctions() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/auctions", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load auction tournaments.");
    setTournaments(result.tournaments);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/auctions", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load auction tournaments.");
        if (active) setTournaments(result.tournaments);
      })
      .catch((error: unknown) => {
        if (active) setStatus(error instanceof Error ? error.message : "Unable to load auctions.");
      });
    return () => { active = false; };
  }, []);

  async function createTournament(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to create tournament.");
      setName("");
      setSlug("");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create tournament.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-sm font-bold text-orange-700 hover:text-orange-800">← Admin dashboard</Link>
        <header className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Auction management</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Live Auctions</h1>
          <p className="mt-2 text-slate-600">Create a tournament, configure the player pool and teams, then host the live auction.</p>
        </header>

        <form onSubmit={createTournament} className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm font-bold text-slate-700">
            Tournament name
            <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. QuadClash Season 2" className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-orange-500" />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Public URL slug <span className="font-normal text-slate-500">(optional)</span>
            <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="quadclash-season-2" className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-orange-500" />
          </label>
          <button disabled={busy} className="h-11 rounded-lg bg-orange-600 px-5 font-extrabold text-white hover:bg-orange-700 disabled:opacity-50">{busy ? "Creating…" : "Create tournament"}</button>
          {status && <p role="alert" className="text-sm font-semibold text-red-700 sm:col-span-3">{status}</p>}
        </form>

        <section className="mt-8 grid gap-4">
          <h2 className="text-lg font-black text-slate-900">Tournaments</h2>
          {tournaments.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">No auction tournaments created yet.</p> : tournaments.map((item) => (
            <Link key={item.id} href={`/admin/auctions/${item.slug}`} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-300 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-extrabold text-slate-950">{item.name}</h3>
                <p className="mt-1 text-sm text-slate-500">/auction/{item.slug}</p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{item.status}</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
