"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const exploreLinks = [
  { href: "/", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/about", label: "About Mufaddal Husain Sports" },
];

const tournamentLinks = [
  { href: "/tournaments/friendshipcup", label: "Friendship Cup" },
  { href: "/tournaments/quadclash100", label: "Quad Clash 100" },
  { href: "/tournaments/inter-mohalla", label: "Inter-Mohalla" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="relative mx-auto flex h-20 max-w-7xl items-center justify-center px-4 sm:h-24 sm:px-6 md:px-10">
        <Link href="/" onClick={closeMenu} className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img src="/mhsports-logo.png" alt="Mufaddal Husain Sports" className="h-16 w-auto max-w-[68vw] object-contain sm:h-20" />
          <div className="hidden text-left sm:block">
            <div className="text-xl font-black tracking-tight text-slate-950 md:text-2xl">MUFADDAL HUSAIN SPORTS</div>
            <div className="mt-1 text-xs font-medium tracking-wide text-slate-500">COMMUNITY • CRICKET • COMPETITION</div>
          </div>
        </Link>

        <nav className="absolute right-4 hidden items-center gap-8 md:right-10 md:flex">
          {exploreLinks.map((item) => (
            <Link key={item.href} href={item.href} className="font-semibold text-slate-700 transition hover:text-orange-500">
              {item.label === "About Mufaddal Husain Sports" ? "About" : item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-xl border border-blue-900 bg-blue-950 text-2xl text-white shadow-sm transition hover:bg-blue-900 md:hidden"
        >
          <span aria-hidden="true">☰</span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] bg-slate-950/45 md:hidden" onClick={closeMenu}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="absolute inset-y-0 right-0 flex w-full max-w-none flex-col overflow-hidden border-l border-blue-950/10 bg-[#f3f7fc] text-[#183451] shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-[76px] shrink-0 items-center justify-end border-b border-slate-200 px-5">
              <button type="button" onClick={closeMenu} aria-label="Close navigation menu" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e0ebf7] text-3xl leading-none text-[#123d60] transition hover:bg-[#cfdef0]">×</button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <div className="mb-2 rounded-xl border-l-4 border-[#5db7ff] bg-[#123e70] px-4 py-3 text-sm font-extrabold tracking-[0.12em] text-[#e6f3ff] shadow-lg">
                EXPLORE
              </div>
              <div className="mb-7 flex flex-col">
                {exploreLinks.map((item) => (
                  <Link key={item.href} href={item.href} onClick={closeMenu} className="rounded-lg px-4 py-4 text-base font-semibold transition hover:bg-[#e2eefb] hover:text-[#124b83]">
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mb-2 rounded-xl border-l-4 border-[#5db7ff] bg-[#123e70] px-4 py-3 text-sm font-extrabold tracking-[0.12em] text-[#e6f3ff] shadow-lg">
                TOURNAMENTS
              </div>
              <div className="flex flex-col">
                {tournamentLinks.map((item) => (
                  <Link key={item.href} href={item.href} onClick={closeMenu} className="rounded-lg px-4 py-4 text-base font-semibold transition hover:bg-[#e2eefb] hover:text-[#124b83]">
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            <div className="shrink-0 border-t border-slate-200 p-5 text-xs text-slate-500">
              MUFADDAL HUSAIN SPORTS <span className="px-1">•</span> COMMUNITY • CRICKET • COMPETITION
            </div>
          </section>
        </div>
      )}
    </header>
  );
}
