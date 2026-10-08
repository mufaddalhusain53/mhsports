"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">

      {/* NAVBAR */}

      <div className="relative mx-auto flex h-24 max-w-7xl items-center justify-center px-4 sm:h-28 sm:px-6 md:px-10">

        {/* CENTER BRAND */}

        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3"
        >

          {/* LOGO */}

          <img
            src="/mhsports-logo.png"
            alt="Mufaddal Husain Sports"
            className="h-20 w-auto object-contain sm:h-24"
          />

          {/* BRAND NAME */}

          <div className="hidden text-left sm:block">

            <div className="text-xl font-black tracking-tight text-slate-950 md:text-2xl">
              MUFFADAL HUSAIN SPORTS
            </div>

            <div className="mt-1 text-xs font-medium tracking-wide text-slate-500">
              COMMUNITY • CRICKET • COMPETITION
            </div>

          </div>

        </Link>


        {/* DESKTOP NAVIGATION */}

        <nav className="absolute right-4 hidden items-center gap-8 md:right-10 md:flex">

          <Link
            href="/"
            className="font-semibold text-slate-700 transition hover:text-orange-500"
          >
            Home
          </Link>

          <Link
            href="/tournaments"
            className="font-semibold text-slate-700 transition hover:text-orange-500"
          >
            Tournaments
          </Link>

          <Link
            href="/about"
            className="font-semibold text-slate-700 transition hover:text-orange-500"
          >
            About
          </Link>

        </nav>


        {/* MOBILE MENU BUTTON */}

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-xl text-slate-800 transition hover:bg-slate-100 md:hidden"
        >
          {open ? "✕" : "☰"}
        </button>

      </div>


      {/* MOBILE MENU */}

      {open && (

        <div className="border-t border-slate-200 bg-white px-6 py-4 shadow-lg md:hidden">

          <nav className="flex flex-col gap-1">

            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-orange-500"
            >
              Home
            </Link>

            <Link
              href="/tournaments"
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-orange-500"
            >
              Tournaments
            </Link>

            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-orange-500"
            >
              About
            </Link>

          </nav>

        </div>

      )}

    </header>
  );
}