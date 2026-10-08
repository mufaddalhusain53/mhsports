"use client";

import { FormEvent, useState } from "react";

export default function AdminLogin() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

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
      setLoading(false);
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl sm:p-9">

        <div className="text-center">
          <img
            src="/mhsports-logo.png"
            alt="Mufaddal Husain Sports"
            className="mx-auto h-24 w-auto object-contain"
          />

          <h1 className="mt-5 text-2xl font-black text-slate-900">
            Admin Login
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Mufaddal Husain Sports
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8">

          <label
            htmlFor="pin"
            className="mb-2 block text-sm font-bold text-slate-700"
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
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-center text-lg tracking-[0.3em] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />

          {error && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 h-12 w-full rounded-xl bg-orange-500 font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Checking..." : "Access Admin"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Authorized access only
        </p>
      </div>
    </main>
  );
}