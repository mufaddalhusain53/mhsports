import Link from "next/link";
const items = [
 {href:"/tournaments/quadclash100/stats", icon:"📊", title:"QuadClash 100 Stats", desc:"Season-wise batting, bowling, fielding and MVP leaderboards."},
 {href:"/tournaments/quadclash100/points-table", icon:"🏆", title:"Season 1 Points Table", desc:"View the official QuadClash 100 Season 1 standings."},
 {href:"/tournaments/quadclash100/teams", icon:"👥", title:"QuadClash 100 Teams", desc:"Choose a season and explore team squads and player details."},
 {href:"/tournaments/quadclash100/season-2", icon:"📅", title:"Season 2 Dates", desc:"Revised dates: 20, 21 and 22 March 2026."},
 {href:"/tournaments/quadclash100/registration", icon:"📝", title:"Season 2 Player Registration", desc:"Registration announcement and updates."},
 {href:"/tournaments/quadclash100/sponsors", icon:"🤝", title:"QuadClash 100 Sponsors", desc:"Tournament sponsors and franchise sponsors."},
 {href:"/tournaments/quadclash100/hall-of-fame", icon:"👑", title:"QuadClash 100 Hall of Fame", desc:"Champions, runners-up and tournament legacy."},
];
export default function QuadClashPage(){return <main className="min-h-screen site-page-surface px-4 py-10 text-slate-950 sm:px-6"><div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.28em] text-orange-500">Mufaddal Husain Sports</p><h1 className="mt-3 text-4xl font-black sm:text-5xl">QuadClash 100</h1><p className="mt-4 max-w-2xl text-slate-600">Everything for QuadClash 100 — stats, standings, teams, sponsors and champions.</p><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item)=> <Link key={item.href} href={item.href} className="group flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-orange-400/70 hover:shadow-md"><span className="text-3xl">{item.icon}</span><h2 className="mt-4 text-xl font-extrabold">{item.title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{item.desc}</p></Link>)}</div></div></main>}
