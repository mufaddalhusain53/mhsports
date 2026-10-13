import SectionShell from "../SectionShell";

const seasons = [
  { season: 1, winner: "Super XI", runnerUp: "Saifee Star" },
  { season: 2, winner: "Shabbir Lions", runnerUp: "Super XI" },
  { season: 3, winner: "Ezzi Strikers", runnerUp: "Shabbir Lions" },
  { season: 4, winner: "Jolly Cricketers", runnerUp: "Ezzi Strikers" },
  { season: 5, winner: "Vista Vikings", runnerUp: "The Highlanders" },
  { season: 6, winner: "Unix Stars", runnerUp: "Saifee Star" },
  { season: 7, inProgress: true },
];

export const metadata = { title: "Friendship Cup Hall of Fame | Mufaddal Husain Sports" };

export default function HallOfFamePage() {
  return <SectionShell title="Hall of Fame" description="A season-by-season record of Friendship Cup champions and runners-up.">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {seasons.map(item => <article key={item.season} className="rounded-2xl border border-white/10 bg-slate-900 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">Season {item.season}</p>
          {item.inProgress && <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300">Live</span>}
        </div>
        {item.inProgress ? <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Status</p><p className="mt-1 text-lg font-extrabold">Tournament in progress</p></div> : <><div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-200">🏆 Champions</p><p className="mt-1 text-xl font-extrabold">{item.winner}</p></div><div className="mt-3 rounded-xl bg-slate-800 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">🥈 Runners-up</p><p className="mt-1 text-lg font-bold">{item.runnerUp}</p></div></>}
      </article>)}
    </div>
  </SectionShell>;
}
