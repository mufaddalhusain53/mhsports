import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import TournamentLogo from "../../../components/TournamentLogo";

const tournament = [{type:"Title Partner",names:["Supreme Industries"]},{type:"Co-Title Partners",names:["Ezzi Arts & Frames","Sunmoon Electricals"]},{type:"Apparel Partners",names:["Eye World Optics","AELYNX"]},{type:"Gifting Partners",names:["Taaj Book Depot","Al-Ahad Perfumes"]},{type:"Catering Partner",names:["Anmol Caterer"]},{type:"Awards Partner",names:["Hatimi Tours"]},{type:"Associate Partners",names:["Unix India","Shopper 52","Shabbir’s Tawakkkal"]},{type:"Digital Media Partner",names:["Inkspire Media"]}];
const sponsorLogos: Record<string, string> = {
  "Supreme Industries": "/quadclash100/sponsors/supreme-industries.png",
  "Eye World Optics": "/quadclash100/sponsors/eye-world-optics.png",
  AELYNX: "/quadclash100/sponsors/aelynx.png",
  "Taaj Book Depot": "/quadclash100/sponsors/taaj-book-depot.png",
  "Al-Ahad Perfumes": "/quadclash100/sponsors/al-ahad-perfumes.png",
  "Anmol Caterer": "/quadclash100/sponsors/anmol-caterers.png",
  "Hatimi Tours": "/quadclash100/sponsors/hatimi-tours.png",
  "Unix India": "/quadclash100/sponsors/unix-india.png",
  "Shopper 52": "/quadclash100/sponsors/shopper-52.png",
  "Shabbir’s Tawakkkal": "/quadclash100/sponsors/shabbir-tawakkal.png",
  "Inkspire Media": "/quadclash100/sponsors/inkspire-media.png",
  "Ezzi Arts & Frames": "/quadclash100/sponsors/ezzi-arts-frames.png",
  "Sunmoon Electricals": "/quadclash100/sponsors/sunmoon-electricals.png",
};
const franchises = [{name:"Multiplize",owner:"Murtaza Lakdawala",team:"Multiplize Highlanders"},{name:"Goodluck Safety",owner:"Mohsin Patrawala",team:"Multiplize Highlanders"},{name:"Cosmic Buns",owner:"Kutub Laila",team:"Mavericks"},{name:"Foal",owner:"Mustafa Pothi",team:"Mavericks"},{name:"Inkspire Media",owner:"Aliasgar Sabuwala",team:"Mavericks"},{name:"Maimoon Creations",owner:"Husain Furniturewala",team:"Strikers"},{name:"Sunmoon Electricals",owner:"Murtaza Electricwala",team:"Ezzi United XIII"},{name:"Ezzi Arts & Frames",owner:"Aliasgar Patanwala",team:"Ezzi United XIII"}];
const teamLogos: Record<string, string> = {
  Strikers: "/quadclash100/logos/strikers.png",
  "Ezzi United XIII": "/quadclash100/logos/ezzi-united.png",
  Mavericks: "/quadclash100/logos/mavericks.png",
  "Multiplize Highlanders": "/quadclash100/logos/multiplize-highlanders.png",
};
const franchiseGroups = Object.entries(franchises.reduce<Record<string, typeof franchises>>((groups, sponsor)=>{const team = sponsor.team; groups[team] ??= []; groups[team].push(sponsor); return groups;}, {}));

function SponsorName({ name }: { name: string }) {
  const normalizedName = name.replace(/’/g, "'");
  const logo = sponsorLogos[name] ?? sponsorLogos[normalizedName] ?? sponsorLogos[normalizedName.replace(/'/g, "’")] ?? "";

  return (
    <div className="flex h-full min-h-[110px] items-center justify-center">
      {logo ? (
        <div className="flex h-full w-full max-w-[300px] items-center justify-center overflow-hidden rounded-none bg-transparent p-0 shadow-none ring-0">
          <Image src={logo} alt={`${name} logo`} width={300} height={110} className="h-full w-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}

function TeamSectionHeader({ team }: { team: string }) {
  const logo = teamLogos[team];

  return (
    <div className="mb-3 flex items-center gap-3">
      {logo ? (
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-transparent p-1 shadow-none">
          <Image src={logo} alt={`${team} logo`} width={48} height={48} className="h-full w-full object-contain" />
        </div>
      ) : null}
      <p className="font-black text-slate-900">{team}</p>
    </div>
  );
}

function SeasonSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode; }) {
  return (
    <details open={defaultOpen} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-left text-lg font-black text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 transition-transform duration-200 group-open:rotate-180">▼</span>
      </summary>
      <div className="border-t border-slate-200 px-4 pb-4 pt-4">{children}</div>
    </details>
  );
}

export default function Sponsors(){return <main className="min-h-screen site-page-surface px-4 py-10 text-slate-950"><div className="mx-auto max-w-6xl"><Link href="/tournaments/quadclash100" className="inline-flex items-center gap-2 rounded-lg border border-orange-400/40 bg-orange-500/10 px-4 py-2.5 text-sm font-extrabold text-orange-600 transition hover:border-orange-300 hover:bg-orange-500/20">← Back to QuadClash 100</Link><div className="mt-8"><TournamentLogo tournament="quadclash100" className="h-28 w-28 sm:h-36 sm:w-36"/></div><h1 className="mt-2 text-4xl font-black">Sponsors</h1><div className="mt-8 space-y-4"><SeasonSection title="Season 1" defaultOpen={false}><h2 className="text-2xl font-black">Tournament Sponsors</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{tournament.map(x=><section key={x.type} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-black uppercase tracking-wider text-orange-600">{x.type}</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{x.names.map(n=><SponsorName key={n} name={n} />)}</div></section>)}</div><h2 className="mt-10 text-2xl font-black">Franchise Sponsors</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{franchiseGroups.map(([team, sponsors])=><section key={team} className="rounded-xl border border-slate-200 bg-white p-4"><TeamSectionHeader team={team} /><div className="mt-3 space-y-2">{sponsors.map(sponsor=><p key={sponsor.name} className="text-sm text-slate-700"><span className="font-semibold text-slate-900">{sponsor.name}</span> ({sponsor.owner})</p>)}</div></section>)}</div></SeasonSection><SeasonSection title="Season 2" defaultOpen={false}><div className="flex min-h-44 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><p className="text-base font-semibold text-slate-500">Sponsors to be revealed soon.</p></div></SeasonSection></div></div></main>}
