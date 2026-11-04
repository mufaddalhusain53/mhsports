"use client";

import { useEffect, useMemo, useState } from "react";
import AuctionImage from "@/app/components/AuctionImage";
import AuctionResultTag from "@/app/auction/AuctionResultTag";
import TeamMark from "@/app/auction/TeamMark";
import { supabase } from "@/lib/supabase/client";

type Team = { id: string; name: string; slug: string; logo_url: string | null; points_remaining: number; rtm_count: number };
type Player = {
  id: string; player_number: number; full_name: string; category: string; role: string | null;
  batting_style: string | null; bowling_style: string | null; previous_team: string | null; photo_url: string | null;
  status: "available" | "sold" | "unsold"; sold_team_id: string | null; sold_price: number | null; rtm_team_id: string | null;
};
type Sponsor = { id: string; name: string; logo_url: string | null };
type Tournament = {
  id: string; slug: string; name: string; status: string; points_per_team: number; base_price: number; min_squad_size: number; max_squad_size: number;
  current_player_id: string | null; current_bid: number | null; current_bid_team_id: string | null;
  background_url: string | null; tournament_logo_url: string | null; organizer_logo_urls: string[];
};
type Data = { tournament: Tournament; teams: Team[]; players: Player[]; sponsors: Sponsor[] };
type Tab = "live" | "teams" | "players";

function points(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : Number(value).toLocaleString("en-IN");
}

function maxBid(pointsRemaining: number, soldCount: number, minSquadSize: number, basePrice: number, rtmCount = 0) {
  const remainingPlayers = Math.max(minSquadSize - soldCount, 0);
  const reserve = Math.max(remainingPlayers - 1, 0) * basePrice;
  return Math.max(0, pointsRemaining - reserve + rtmCount * basePrice);
}

export default function AuctionProjector({ slug }: { slug: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("live");
  const [fullscreen, setFullscreen] = useState(false);
  const [search, setSearch] = useState("");
  const [logoIndex, setLogoIndex] = useState(0);
  const [listPage, setListPage] = useState(0);

  useEffect(() => {
    let active = true;
    fetch(`/api/auctions/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load projector view.");
        if (active) setData(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load projector view.");
      });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!data?.tournament.id) return;
    const tournamentId = data.tournament.id;
    const channel = supabase.channel(`projector-auction-${tournamentId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "auction_tournaments", filter: `slug=eq.${slug}` }, ({ new: row }) => {
        setData((previous) => previous ? { ...previous, tournament: { ...previous.tournament, ...(row as Partial<Tournament>) } } : previous);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_teams", filter: `tournament_id=eq.${tournamentId}` }, (change) => {
        const row = change.new as Partial<Team>;
        setData((previous) => {
          if (!previous) return previous;
          if (change.eventType === "DELETE") return { ...previous, teams: previous.teams.filter((team) => team.id !== change.old.id) };
          return { ...previous, teams: previous.teams.map((team) => team.id === row.id ? { ...team, ...row } : team) };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_players", filter: `tournament_id=eq.${tournamentId}` }, (change) => {
        const row = change.new as Partial<Player>;
        setData((previous) => {
          if (!previous) return previous;
          if (change.eventType === "DELETE") return { ...previous, players: previous.players.filter((player) => player.id !== change.old.id) };
          return { ...previous, players: previous.players.map((player) => player.id === row.id ? { ...player, ...row } : player) };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_sponsors", filter: `tournament_id=eq.${tournamentId}` }, (change) => {
        const row = change.new as Partial<Sponsor>;
        setData((previous) => {
          if (!previous) return previous;
          if (change.eventType === "DELETE") return { ...previous, sponsors: previous.sponsors.filter((sponsor) => sponsor.id !== change.old.id) };
          const exists = previous.sponsors.some((sponsor) => sponsor.id === row.id);
          return { ...previous, sponsors: exists ? previous.sponsors.map((sponsor) => sponsor.id === row.id ? { ...sponsor, ...row } : sponsor) : [...previous.sponsors, row as Sponsor] };
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [data?.tournament.id, slug]);

  useEffect(() => {
    function updateFullscreen() {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setLogoIndex((index) => index + 1), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (data?.players ?? []).filter((player) =>
      !query || `${player.full_name} ${player.player_number} ${player.category} ${player.status}`.toLocaleLowerCase().includes(query)
    );
  }, [data, search]);

  async function toggleFullscreen() {
    const projector = document.getElementById("auction-projector");
    if (!document.fullscreenElement) await projector?.requestFullscreen();
    else await document.exitFullscreen();
  }

  if (!data) return <main className="grid h-dvh place-items-center overflow-hidden bg-slate-950 p-6 text-center text-white"><p>{error || "Loading projector…"}</p></main>;

  const { tournament, teams, players, sponsors } = data;
  const currentPlayer = players.find((player) => player.id === tournament.current_player_id);
  const currentTeam = teams.find((team) => team.id === tournament.current_bid_team_id);
  const resultTeam = currentPlayer?.status === "sold"
    ? teams.find((team) => team.id === currentPlayer.sold_team_id)
    : undefined;
  const activeTeam = currentTeam ?? resultTeam;
  const activeTeamRoster = activeTeam ? players.filter((player) => player.status === "sold" && player.sold_team_id === activeTeam.id).length : 0;
  const soldPlayers = players.filter((player) => player.status === "sold");
  const organizerLogos = tournament.organizer_logo_urls ?? [];
  const sponsorLogos = sponsors.filter((sponsor) => sponsor.logo_url);
  const organizerLogo = organizerLogos.length ? organizerLogos[logoIndex % organizerLogos.length] : null;
  const sponsor = sponsorLogos.length ? sponsorLogos[logoIndex % sponsorLogos.length] : null;
  const categoryValues = Array.from(new Set((players ?? []).map((player) => player.category.trim()).filter((value) => value && value.toUpperCase() !== "NONE")));
  const shouldDisplayCategory = categoryValues.length > 1;
  const roleValue = currentPlayer ? (currentPlayer.role ?? (shouldDisplayCategory ? currentPlayer.category : null)) : null;
  const detailCards = currentPlayer ? [
    { label: "Name", value: currentPlayer.full_name },
    ...(roleValue ? [{ label: "Role", value: roleValue }] : []),
    { label: "Batting", value: currentPlayer.batting_style ?? "—" },
    { label: "Bowling", value: currentPlayer.bowling_style ?? "—" },
    { label: "Last year team", value: currentPlayer.previous_team ?? "—" },
  ] : [];
  const pageSize = tab === "teams" ? 6 : 12;
  const pageItems = tab === "teams" ? teams : filteredPlayers;
  const pageCount = Math.max(1, Math.ceil(pageItems.length / pageSize));
  const page = listPage % pageCount;
  const visibleTeams = teams.slice(page * pageSize, page * pageSize + pageSize);
  const visiblePlayers = filteredPlayers.slice(page * pageSize, page * pageSize + pageSize);
  const backgroundStyle = tournament.background_url
    ? { backgroundImage: `linear-gradient(rgba(16, 24, 30, 0.36), rgba(16, 24, 30, 0.48)), url("${tournament.background_url.replace(/["\\]/g, "")}")` }
    : undefined;

  return (
    <main id="auction-projector" style={backgroundStyle} className="h-dvh w-screen overflow-hidden bg-slate-900 bg-cover bg-center text-white">
      <div className="mx-auto flex h-full max-w-[1920px] flex-col gap-0 p-0">
        <header className="grid h-[20dvh] min-h-[150px] max-h-[250px] shrink-0 grid-cols-[1fr_auto_1fr] items-center rounded-none bg-transparent px-4 sm:px-6">
          <div className="flex h-full items-center justify-start overflow-hidden">{organizerLogo && <AuctionImage src={organizerLogo} alt="Tournament organizer" width={520} height={520} className="h-[16dvh] max-h-[220px] w-auto max-w-[26vw] object-contain drop-shadow-[0_0_30px_rgba(255,178,80,0.35)]" />}</div>
          <div className="flex min-w-0 items-center justify-center gap-2 text-center sm:gap-4">
            {tournament.tournament_logo_url && <AuctionImage src={tournament.tournament_logo_url} alt="Tournament logo" width={760} height={760} className="h-[18dvh] max-h-[240px] w-auto max-w-[42vw] object-contain drop-shadow-[0_0_36px_rgba(255,178,80,0.4)]" />}
          </div>
          <div className="flex h-full items-center justify-end gap-3 overflow-hidden">
            {sponsor?.logo_url && <AuctionImage src={sponsor.logo_url} alt={sponsor.name} width={520} height={520} className="h-[16dvh] max-h-[220px] w-auto max-w-[26vw] object-contain drop-shadow-[0_0_30px_rgba(255,178,80,0.35)]" />}
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-hidden rounded-none bg-transparent p-0 relative">
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-slate-950/40 p-1.5 shadow-none backdrop-blur-none">
            {([
              ["live", "A"],
              ["teams", "T"],
              ["players", "P"],
              ["fullscreen", "F"],
            ] as const).map(([key, label]) => <button key={key} onClick={() => { if (key === "fullscreen") { void toggleFullscreen(); return; } setTab(key); setListPage(0); }} aria-label={key === "live" ? "Live auction" : key === "teams" ? "Teams" : key === "players" ? "Players" : "Fullscreen"} className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black uppercase transition ${key === "fullscreen" ? "bg-orange-400 text-slate-950 shadow-none" : tab === key ? "bg-orange-400 text-slate-950 shadow-none" : "bg-slate-800/70 text-white/90 hover:bg-slate-700"}`}>{label}</button>)}
          </div>

          {tab === "live" && <div className="absolute bottom-4 left-4 z-10 flex items-end gap-6 text-center">
            {([
              ["Players", players.length],
              ["Sold", soldPlayers.length],
              ["Unsold", players.filter((player) => player.status === "unsold").length],
              ["Available", players.filter((player) => player.status === "available").length],
            ] as const).map(([label, value]) => <div key={label} className="flex flex-col items-center justify-end rounded-lg bg-transparent px-2 pb-0"><p className="text-3xl font-black leading-none sm:text-5xl">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/70 sm:text-[11px]">{label}</p></div>)}
          </div>}

          {tab === "live" && <div className="relative grid h-full min-h-0 items-stretch gap-1 lg:grid-cols-[1.7fr_0.9fr]">
            <div className="relative flex min-h-0 flex-col justify-center overflow-hidden rounded-none bg-transparent p-0 text-center sm:p-0">
              {currentPlayer ? <>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300 sm:text-sm" style={{ WebkitTextStroke: "0.8px rgba(255,255,255,0.36)", textShadow: "0 0 2px rgba(255,255,255,0.4), 0 0 12px rgba(255,163,43,0.42), 0 3px 10px rgba(0,0,0,0.85)" }}>
                  Player #{currentPlayer.player_number}{shouldDisplayCategory ? ` · ${currentPlayer.category}` : ""}
                </p>
                <div className="mt-2 flex min-h-0 flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5 sm:text-left">
                  <div className="relative rounded-[1.75rem] border border-orange-300/80 bg-slate-950/20 p-2 shadow-[0_0_20px_rgba(251,146,60,0.18)] backdrop-blur-[1px] sm:p-3">
                    {currentPlayer.photo_url ? <AuctionImage src={currentPlayer.photo_url} alt="" width={220} height={220} className="h-[24vh] max-h-56 w-[24vh] max-w-56 shrink-0 rounded-[1.2rem] object-cover" /> : <div className="grid h-[24vh] max-h-56 w-[24vh] max-w-56 shrink-0 place-items-center rounded-[1.2rem] bg-white/10 text-5xl">🏏</div>}
                    {currentPlayer.rtm_team_id && <div className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-950 shadow-md">RTM</div>}
                  </div>
                  <div className="min-w-0 space-y-2">
                    {detailCards.map((detail) => (
                      <div key={detail.label} className="rounded-[0.7rem] border border-orange-300/80 bg-slate-950/25 px-3 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] sm:px-3.5 sm:py-2.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.26em] text-orange-200/90">{detail.label}</p>
                        <p className="mt-1.5 text-base font-black leading-tight text-white sm:text-xl lg:text-[min(3vh,1.9rem)]" style={{ WebkitTextStroke: "0.7px rgba(255,255,255,0.26)", textShadow: "0 0 8px rgba(255,255,255,0.08)" }}>{detail.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </> : <div><p className="text-sm font-black uppercase tracking-[0.2em] text-orange-300">{tournament.status === "completed" ? "Auction completed" : "Waiting for next player"}</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">{tournament.status === "completed" ? "Thank you!" : "Get ready"}</h2><p className="mt-2 text-sm text-white/75 sm:text-lg">{tournament.status === "completed" ? `${soldPlayers.length} players sold` : "The next player will appear here as soon as the host calls them."}</p></div>}
            </div>
            {currentPlayer && currentPlayer.status !== "available" && <div className="pointer-events-none absolute left-[58%] top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"><AuctionResultTag status={currentPlayer.rtm_team_id ? "rtm" : currentPlayer.status} className="!right-auto !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2" /></div>}
            <aside className="grid min-h-0 grid-rows-[1fr_auto] gap-2 pb-14 pl-4">
              <div className="flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-none bg-transparent p-1 text-center sm:p-2">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">{currentPlayer?.status === "sold" ? "Sold for" : currentPlayer?.status === "unsold" ? "Auction result" : currentTeam ? "" : "Base price"}</p>
                <p className="mt-1 text-5xl font-black text-orange-300 sm:text-6xl">{currentPlayer?.status === "sold" ? points(currentPlayer.sold_price) : currentPlayer?.status === "unsold" ? "UNSOLD" : points(tournament.current_bid ?? tournament.base_price)}</p>
                {currentPlayer?.status !== "unsold" && <p className="text-sm font-bold text-white/80 sm:text-lg">POINTS</p>}
                {(currentTeam || resultTeam) && <div className="mt-2 flex min-h-0 w-full flex-col items-center pt-0"><TeamMark name={activeTeam!.name} logoUrl={activeTeam!.logo_url} size="lg" /><p className="mt-1 line-clamp-2 text-center text-base font-black uppercase text-white sm:text-xl">{activeTeam?.name}</p><div className="mt-2 grid w-full max-w-xs grid-cols-2 gap-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-white sm:text-[11px]"><div className="rounded-lg bg-white/5 px-2 py-2"><span className="block text-white">Balance</span><span className="mt-1 block text-sm font-black text-white sm:text-base">{points(activeTeam?.points_remaining ?? 0)}</span></div><div className="rounded-lg bg-white/5 px-2 py-2"><span className="block text-white">Squad</span><span className="mt-1 block text-sm font-black text-white sm:text-base">{activeTeamRoster}/{tournament.max_squad_size}</span></div></div></div>}
                {!currentTeam && !resultTeam && currentPlayer?.status === "available" && <p className="mt-2 text-sm text-white/70 sm:text-lg">No bids yet</p>}
              </div>
            </aside>
          </div>}

          {tab === "teams" && <div className="flex h-full min-h-0 flex-col">
            <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2 xl:grid-cols-3">
              {visibleTeams.map((team) => {
                const roster = soldPlayers.filter((player) => player.sold_team_id === team.id);
                const spent = tournament.points_per_team - team.points_remaining;
                const currentMax = maxBid(team.points_remaining, roster.length, tournament.min_squad_size, tournament.base_price, team.rtm_count ?? 0);
                return <article key={team.id} className="flex min-h-0 items-center gap-3 overflow-hidden rounded-[1rem] border border-orange-300/80 bg-slate-950/20 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-[1px] sm:gap-4 sm:p-4">
                  <TeamMark name={team.name} logoUrl={team.logo_url} size="md" />
                  <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-black uppercase sm:text-xl">{team.name}</h2><p className="mt-1 text-xs text-white/70 sm:text-sm">{roster.length} players</p>{(team.rtm_count ?? 0) > 0 && <p className="mt-1 text-[10px] font-bold text-amber-200 sm:text-xs">RTM x{team.rtm_count}</p>}<p className="mt-1 text-[10px] font-bold text-white/70 sm:text-xs">Spent {points(spent)}</p><p className="mt-1 text-[10px] font-bold text-white/70 sm:text-xs">Max {points(currentMax)}</p></div>
                  <div className="text-right"><p className="text-lg font-black text-orange-300 sm:text-2xl">{points(team.points_remaining)}</p></div>
                </article>;
              })}
            </div>
            {pageCount > 1 && <div className="flex shrink-0 items-center justify-center gap-4 pt-2"><button onClick={() => setListPage((page) => (page - 1 + pageCount) % pageCount)} className="rounded-lg bg-white/15 px-4 py-1 text-sm font-black">←</button><span className="text-xs font-bold">Page {page + 1} / {pageCount}</span><button onClick={() => setListPage((page) => (page + 1) % pageCount)} className="rounded-lg bg-white/15 px-4 py-1 text-sm font-black">→</button></div>}
          </div>}

          {tab === "players" && <div className="flex h-full min-h-0 flex-col">
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2"><div><h2 className="text-xl font-black sm:text-3xl">Players</h2><p className="text-xs text-white/70">{filteredPlayers.length} players</p></div><input value={search} onChange={(event) => { setSearch(event.target.value); setListPage(0); }} placeholder="Search players…" className="h-9 w-full max-w-xs rounded-lg bg-slate-950/40 px-3 text-sm text-white outline-none placeholder:text-white/50" /></div>
            <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2 xl:grid-cols-4">
              {visiblePlayers.map((player) => {
                const buyer = teams.find((team) => team.id === player.sold_team_id);
                return <article key={player.id} className="flex min-h-0 items-center gap-2 overflow-hidden rounded-[0.9rem] border border-orange-300/80 bg-slate-950/20 p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-[1px] sm:gap-3 sm:p-3">
                  {player.photo_url ? <AuctionImage src={player.photo_url} alt="" width={64} height={64} className="h-10 w-10 shrink-0 rounded-lg object-cover sm:h-14 sm:w-14" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 text-lg sm:h-14 sm:w-14 sm:text-xl">🏏</span>}
                  <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-1"><p className="truncate text-xs font-black sm:text-base">{player.full_name}</p><span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase sm:text-[10px] ${player.status === "sold" ? "bg-green-500 text-white" : player.status === "unsold" ? "bg-slate-500 text-white" : "bg-amber-300 text-slate-950"}`}>{player.status}</span></div><p className="truncate text-[10px] text-white/70 sm:text-xs">#{player.player_number}{shouldDisplayCategory ? ` · ${player.category}` : ""}</p><p className="truncate text-[9px] font-bold text-orange-200 sm:text-xs">{buyer ? `${buyer.name} · ${points(player.sold_price)} pts` : "—"}</p></div>
                </article>;
              })}
            </div>
            {pageCount > 1 && <div className="flex shrink-0 items-center justify-center gap-4 pt-2"><button onClick={() => setListPage((page) => (page - 1 + pageCount) % pageCount)} className="rounded-lg bg-white/15 px-4 py-1 text-sm font-black">←</button><span className="text-xs font-bold">Page {page + 1} / {pageCount}</span><button onClick={() => setListPage((page) => (page + 1) % pageCount)} className="rounded-lg bg-white/15 px-4 py-1 text-sm font-black">→</button></div>}
          </div>}
        </section>
        {error && <p role="alert" className="fixed bottom-2 left-2 right-2 rounded-lg bg-red-950/90 px-4 py-2 text-sm font-bold text-white">{error}</p>}
      </div>
    </main>
  );
}
