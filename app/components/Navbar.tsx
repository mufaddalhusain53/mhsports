"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { INTER_MOHALLA_ENABLED } from "@/lib/tournament-features";

const exploreLinks = [
  { href: "/", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/about", label: "About Mufaddal Husain Sports" },
];

export default function Navbar({ brand = "site" }: { brand?: "site" | "admin" | "auction" }) {
  const [open, setOpen] = useState(false);
  const [friendshipOpen, setFriendshipOpen] = useState(false);
  const [quadClashOpen, setQuadClashOpen] = useState(false);

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
  const navigationLinks = brand === "site" ? exploreLinks : [...exploreLinks, { href: "/admin", label: "Admin" }];
  const MainSiteLink = brand === "auction" ? "a" : Link;
  const branding = brand === "auction"
    ? { href: "/admin/auctions", logo: "/beyond-auctions-logo.png", name: "Beyond Auctions", tagline: "AUCTION MANAGEMENT" }
    : brand === "admin"
      ? { href: "/admin", logo: "/beyond-boundaries-logo.png", name: "Beyond Boundaries", tagline: "ADMINISTRATION" }
      : { href: "/", logo: "/mhsports-logo.png", name: "Mufaddal Husain Sports", tagline: "COMMUNITY • CRICKET • COMPETITION" };

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-200/20 bg-gradient-to-r from-slate-950 via-blue-950 to-sky-900 shadow-[0_8px_24px_rgba(15,23,42,0.2)]">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:h-24 sm:px-6 md:px-10">
        <Link href={branding.href} onClick={closeMenu} className="flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200 sm:gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow-md ring-1 ring-white/30 sm:h-16 sm:w-16">
            <img src={branding.logo} alt={branding.name} className="h-full w-full object-contain" />
          </span>
          <div className="min-w-0 text-left">
            <div className="truncate text-[clamp(0.65rem,3.4vw,0.875rem)] font-black uppercase tracking-tight text-white sm:text-lg md:text-xl">{branding.name}</div>
            <div className="mt-0.5 truncate text-[9px] font-bold tracking-wide text-cyan-100/80 sm:mt-1 sm:text-xs">{branding.tagline}</div>
          </div>
        </Link>

        <nav aria-label="Main navigation" className="hidden shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 lg:flex">
          {navigationLinks.map((item) => (
            <MainSiteLink key={item.href} href={item.href} className="rounded-full px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
              {item.label === "About Mufaddal Husain Sports" ? "About" : item.label}
            </MainSiteLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-2xl text-white shadow-sm transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 lg:hidden"
        >
          <span aria-hidden="true">☰</span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 lg:hidden" onClick={closeMenu}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="absolute inset-y-0 right-0 flex w-full max-w-none flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-sky-900 text-white shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-[76px] shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Navigation</p>
                <p className="mt-1 truncate text-base font-black">{branding.name}</p>
              </div>
              <button type="button" onClick={closeMenu} aria-label="Close navigation menu" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-3xl leading-none text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">×</button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <div className="mb-3 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                EXPLORE
              </div>
              <div className="mb-7 flex flex-col gap-2">
                {navigationLinks.map((item) => (
                  <MainSiteLink key={item.href} href={item.href} onClick={closeMenu} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base font-bold text-slate-100 transition hover:border-cyan-200/30 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
                    <span>{item.label}</span><span aria-hidden="true" className="text-cyan-200">→</span>
                  </MainSiteLink>
                ))}
              </div>

              <div className="mb-3 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                TOURNAMENTS
              </div>
              <div className="flex flex-col gap-2">
                <button type="button" aria-expanded={friendshipOpen} onClick={() => setFriendshipOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-base font-bold text-slate-100 transition hover:border-cyan-200/30 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
                  <span>Friendship Cup</span><span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cyan-300/10 text-lg text-cyan-200">{friendshipOpen ? "−" : "+"}</span>
                </button>
                {friendshipOpen && <div className="ml-4 flex flex-col border-l-2 border-cyan-300/30 pl-3">
                  {[
                    { href: "/tournaments/friendshipcup/fcstats", label: "Player Statistics" },
                    { href: "/tournaments/friendshipcup/fcschedule", label: "Season Schedule" },
                    { href: "/tournaments/friendshipcup/fcpointstable", label: "Points Table" },
                    { href: "/tournaments/friendshipcup/fchalloffame", label: "Hall Of Fame" },
                    { href: "/tournaments/friendshipcup/committee", label: "Friendship Group Committee" },
                  ].map((item) => <MainSiteLink key={item.href} href={item.href} onClick={closeMenu} className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">{item.label}</MainSiteLink>)}
                </div>}
                <button type="button" aria-expanded={quadClashOpen} onClick={() => setQuadClashOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-base font-bold text-slate-100 transition hover:border-cyan-200/30 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
                  <span>QuadClash 100</span><span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cyan-300/10 text-lg text-cyan-200">{quadClashOpen ? "−" : "+"}</span>
                </button>
                {quadClashOpen && <div className="ml-4 flex flex-col border-l-2 border-cyan-300/30 pl-3">
                  {[
                    { href: "/tournaments/quadclash100/stats", label: "Player Statistics" },
                    { href: "/tournaments/quadclash100/points-table", label: "Points Table" },
                    { href: "/tournaments/quadclash100/teams", label: "Teams" },
                    { href: "/tournaments/quadclash100/registration", label: "Season 2 Registration" },
                    { href: "/tournaments/quadclash100/sponsors", label: "Sponsors" },
                    { href: "/tournaments/quadclash100/hall-of-fame", label: "Hall of Fame" },
                    { href: "/tournaments/quadclash100/organizing-team", label: "Organizing Team" },
                  ].map((item) => <MainSiteLink key={item.href} href={item.href} onClick={closeMenu} className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">{item.label}</MainSiteLink>)}
                </div>}
                {INTER_MOHALLA_ENABLED && <MainSiteLink href="/tournaments/inter-mohalla" onClick={closeMenu} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base font-bold text-slate-100 transition hover:border-cyan-200/30 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">Inter-Mohalla</MainSiteLink>}
              </div>
            </nav>

            <div className="shrink-0 border-t border-white/10 px-5 py-4 text-xs font-semibold tracking-wide text-cyan-100/70">
              {branding.name.toUpperCase()} • {branding.tagline}
            </div>
          </section>
        </div>
      )}
    </header>
  );
}
