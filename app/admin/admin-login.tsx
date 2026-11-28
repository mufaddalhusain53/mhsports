"use client";

import { FormEvent, useState } from "react";

export default function AdminLogin({ auction = false, restricted = false }: { auction?: boolean; restricted?: boolean }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(restricted ? "Auction administration requires a super admin PIN." : "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Incorrect PIN.");
        return;
      }

      if (auction) window.location.reload();
      else window.location.href = "/admin";
    } catch {
      setError("Unable to reach the login service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-[calc(100dvh-5rem)] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-4 py-8 sm:min-h-[calc(100dvh-6rem)] sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-[0_24px_70px_rgba(2,6,23,0.4)]">
        <div aria-hidden="true" className="h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400" />
        <div className="px-6 py-7 sm:px-9 sm:py-9">
          <div className="text-center">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-2xl border border-slate-100 bg-slate-50 p-2 shadow-sm">
              <img
                src={auction ? "/beyond-auctions-logo.png" : "/beyond-boundaries-logo.png"}
                alt={auction ? "Beyond Auctions" : "Beyond Boundaries"}
                className="h-full w-full object-contain"
              />
            </div>

            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">
              {auction ? "Beyond Auctions" : "Beyond Boundaries"}
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Admin Login
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Enter your PIN to access the admin area.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7">
            <label
              htmlFor="pin"
              className="mb-2 block text-sm font-bold text-slate-800"
            >
              Admin PIN
            </label>

            <input
              id="pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter admin PIN"
              className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-center text-lg tracking-[0.2em] text-slate-900 outline-none transition placeholder:text-sm placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />

            {error && (
              <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 h-12 w-full rounded-xl bg-gradient-to-r from-blue-800 to-sky-800 font-black text-white shadow-md transition hover:from-blue-900 hover:to-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Checking..." : "Access Admin"}
            </button>
          </form>

          <p className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-600">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Authorized access only
          </p>
        </div>
      </div>
    </main>
  );
}