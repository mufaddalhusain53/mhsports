"use client";

import { useEffect, useMemo, useState } from "react";
import AuctionImage from "@/app/components/AuctionImage";
import AuctionResultTag from "@/app/auction/AuctionResultTag";
import TeamMark from "@/app/auction/TeamMark";
import { supabase } from "@/lib/supabase/client";

type Team = { id: string; name: string; slug: string; logo_url: string | null; points_remaining: number };
type Player = {
  id: string; player_number: number; full_name: string; category: string; role: string | null;
  batting_style: string | null; bowling_style: string | null; previous_team: string | null; photo_url: string | null;
  status: "available" | "sold" | "unsold"; sold_team_id: string | null; sold_price: number | null;
};
type Sponsor = { id: string; name: string; logo_url: string | null };
type Tournament = {
  id: string; slug: string; name: string; status: string; points_per_team: number; base_price: number;
  current_player_id: string | null; current_bid: number | null; current_bid_team_id: string | null;
  background_url: string | null; tournament_logo_url: string | null; organizer_logo_urls: string[];
};
type Data = { tournament: Tournament; teams: Team[]; players: Player[]; sponsors: Sponsor[] };
type Tab = "live" | "teams" | "players";

function points(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : Number(value).toLocaleString("en-IN");
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
  const soldPlayers = players.filter((player) => player.status === "sold");
  const organizerLogos = tournament.organizer_logo_urls ?? [];
  const sponsorLogos = sponsors.filter((sponsor) => sponsor.logo_url);
  const organizerLogo = organizerLogos.length ? organizerLogos[logoIndex % organizerLogos.length] : null;
  const sponsor = sponsorLogos.length ? sponsorLogos[logoIndex % sponsorLogos.length] : null;
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
      <div className="mx-auto flex h-full max-w-[1920px] flex-col gap-2 p-2 sm:gap-3 sm:p-3">
        <header className="grid h-[11dvh] min-h-14 max-h-24 shrink-0 grid-cols-[1fr_2fr_1fr] items-center rounded-xl border border-white/30 bg-slate-950/20 px-3 shadow-lg sm:px-5">
          <div className="flex h-full items-center justify-start">{organizerLogo && <AuctionImage src={organizerLogo} alt="Tournament organizer" width={160} height={90} className="max-h-[9dvh] max-w-full object-contain" />}</div>
          <div className="flex min-w-0 items-center justify-center gap-2 text-center sm:gap-4">
            {tournament.tournament_logo_url && <AuctionImage src={tournament.tournament_logo_url} alt="" width={96} height={96} className="h-[8dvh] max-h-20 w-auto max-w-[18vw] object-contain" />}
            <div className="min-w-0"><p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-orange-200 sm:text-xs">Live auction</p><h1 className="mt-0.5 line-clamp-2 text-sm font-black sm:text-xl lg:text-2xl">{tournament.name}</h1></div>
          </div>
          <div className="flex h-full items-center justify-end gap-2">
            {sponsor?.logo_url && <AuctionImage src={sponsor.logo_url} alt={sponsor.name} width={160} height={90} className="max-h-[8dvh] max-w-[75%] object-contain" />}
            <button aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={() => void toggleFullscreen()} className="rounded-lg bg-orange-400 px-2 py-1.5 text-xs font-black text-slate-950 hover:bg-orange-300 sm:px-3">{fullscreen ? "Exit" : "⛶"}</button>
          </div>
        </header>

        <nav className="flex h-[7dvh] min-h-10 max-h-14 shrink-0 items-center gap-2 rounded-xl border border-white/30 bg-slate-950/20 p-1.5 shadow-lg sm:p-2">
          {([
            ["live", "Live auction"],
            ["teams", "Teams"],
            ["players", "Players"],
          ] as const).map(([key, label]) => <button key={key} onClick={() => { setTab(key); setListPage(0); }} className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition sm:px-5 sm:py-3 sm:text-base ${tab === key ? "bg-orange-400 text-slate-950" : "text-white/85 hover:bg-white/10"}`}>{label}</button>)}
          <div className="ml-auto hidden items-center gap-4 px-3 text-sm font-black uppercase sm:flex"><span className="text-green-300">Sold {soldPlayers.length}</span><span className="text-amber-200">Available {players.filter((player) => player.status === "available").length}</span></div>
        </nav>

        <section className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/30 bg-slate-950/10 p-2 shadow-2xl sm:p-4">
          {tab === "live" && <div className="grid h-full min-h-0 items-stretch gap-2 lg:grid-cols-[1.45fr_0.8fr]">
            <div className="relative flex min-h-0 flex-col justify-center overflow-hidden rounded-xl border border-white/30 bg-slate-950/10 p-3 text-center sm:p-5">
              {currentPlayer ? <>
                {currentPlayer.status !== "available" && <AuctionResultTag status={currentPlayer.status} />}
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300 sm:text-sm">Player #{currentPlayer.player_number} · {currentPlayer.category}</p>
                <div className="mt-2 flex min-h-0 flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5 sm:text-left">
                  {currentPlayer.photo_url ? <AuctionImage src={currentPlayer.photo_url} alt="" width={240} height={240} className="h-[30vh] max-h-64 w-[30vh] max-w-64 shrink-0 rounded-full border-4 border-orange-400 object-cover sm:border-8" /> : <div className="grid h-[30vh] max-h-64 w-[30vh] max-w-64 shrink-0 place-items-center rounded-full border-4 border-orange-400 bg-white/10 text-5xl sm:border-8 sm:text-6xl">🏏</div>}
                  <div className="min-w-0"><h2 className="text-3xl font-black leading-tight sm:text-4xl lg:text-[min(6vh,4.5rem)]">{currentPlayer.full_name}</h2><p className="mt-1 text-base font-bold text-orange-100 sm:text-xl">{currentPlayer.role ?? currentPlayer.category}</p>{currentPlayer.batting_style && <p className="mt-1 text-sm text-white/80 sm:text-base">{currentPlayer.batting_style}</p>}{currentPlayer.bowling_style && <p className="mt-1 text-sm text-white/80 sm:text-base">{currentPlayer.bowling_style}</p>}{currentPlayer.previous_team && <p className="mt-1 text-xs text-white/65 sm:text-sm">Played team last year · {currentPlayer.previous_team}</p>}</div>
                </div>
              </> : <div><p className="text-sm font-black uppercase tracking-[0.2em] text-orange-300">{tournament.status === "completed" ? "Auction completed" : "Waiting for next player"}</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">{tournament.status === "completed" ? "Thank you!" : "Get ready"}</h2><p className="mt-2 text-sm text-white/75 sm:text-lg">{tournament.status === "completed" ? `${soldPlayers.length} players sold` : "The next player will appear here as soon as the host calls them."}</p></div>}
            </div>
            <aside className="grid min-h-0 grid-rows-[1fr_auto] gap-2">
              <div className="flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-white/30 bg-slate-950/15 p-3 text-center sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">{currentPlayer?.status === "sold" ? "Sold for" : currentPlayer?.status === "unsold" ? "Auction result" : currentTeam ? "Highest bid" : "Base price"}</p>
                <p className="mt-1 text-5xl font-black text-orange-300 sm:text-7xl">{currentPlayer?.status === "sold" ? points(currentPlayer.sold_price) : currentPlayer?.status === "unsold" ? "UNSOLD" : points(tournament.current_bid ?? tournament.base_price)}</p>
                {currentPlayer?.status !== "unsold" && <p className="text-sm font-bold text-white/80 sm:text-lg">POINTS</p>}
                {(currentTeam || resultTeam) && <div className="mt-2 flex min-h-0 flex-col items-center border-t border-white/20 pt-2"><TeamMark name={(currentTeam ?? resultTeam)!.name} logoUrl={(currentTeam ?? resultTeam)!.logo_url} size="lg" /><p className="mt-1 line-clamp-2 text-base font-black uppercase sm:text-xl">{(currentTeam ?? resultTeam)?.name}</p></div>}
                {!currentTeam && !resultTeam && currentPlayer?.status === "available" && <p className="mt-2 text-sm text-white/70 sm:text-lg">No bids yet</p>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[["Teams", teams.length], ["Players", players.length], ["Sold", soldPlayers.length]].map(([label, value]) => <div key={label} className="rounded-lg border border-white/15 bg-slate-950/55 p-2"><p className="text-xl font-black sm:text-2xl">{value}</p><p className="text-[9px] font-black uppercase tracking-wider text-white/65 sm:text-xs">{label}</p></div>)}
              </div>
            </aside>
          </div>}

          {tab === "teams" && <div className="flex h-full min-h-0 flex-col">
            <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2 xl:grid-cols-3">
              {visibleTeams.map((team) => {
                const roster = soldPlayers.filter((player) => player.sold_team_id === team.id);
                return <article key={team.id} className="flex min-h-0 items-center gap-3 overflow-hidden rounded-xl border border-white/20 bg-slate-950/65 p-3 shadow-lg sm:gap-4 sm:p-4">
                  <TeamMark name={team.name} logoUrl={team.logo_url} size="md" />
                  <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-black uppercase sm:text-xl">{team.name}</h2><p className="mt-1 text-xs text-white/70 sm:text-sm">{roster.length} players</p><p className="mt-1 text-[10px] font-bold text-white/70 sm:text-xs">Spent {points(tournament.points_per_team - team.points_remaining)}</p></div>
                  <div className="text-right"><p className="text-lg font-black text-orange-300 sm:text-2xl">{points(team.points_remaining)}</p><p className="text-[9px] font-black uppercase text-green-300 sm:text-xs">Remaining</p></div>
                </article>;
              })}
            </div>
            {pageCount > 1 && <div className="flex shrink-0 items-center justify-center gap-4 pt-2"><button onClick={() => setListPage((page) => (page - 1 + pageCount) % pageCount)} className="rounded-lg bg-white/15 px-4 py-1 text-sm font-black">←</button><span className="text-xs font-bold">Page {page + 1} / {pageCount}</span><button onClick={() => setListPage((page) => (page + 1) % pageCount)} className="rounded-lg bg-white/15 px-4 py-1 text-sm font-black">→</button></div>}
          </div>}

          {tab === "players" && <div className="flex h-full min-h-0 flex-col">
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2"><div><h2 className="text-xl font-black sm:text-3xl">Players</h2><p className="text-xs text-white/70">{filteredPlayers.length} players</p></div><input value={search} onChange={(event) => { setSearch(event.target.value); setListPage(0); }} placeholder="Search players…" className="h-9 w-full max-w-xs rounded-lg border border-white/25 bg-slate-950/60 px-3 text-sm text-white outline-none placeholder:text-white/50 focus:border-orange-300" /></div>
            <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2 xl:grid-cols-4">
              {visiblePlayers.map((player) => {
                const buyer = teams.find((team) => team.id === player.sold_team_id);
                return <article key={player.id} className="flex min-h-0 items-center gap-2 overflow-hidden rounded-lg border border-white/15 bg-slate-950/65 p-2 sm:gap-3 sm:p-3">
                  {player.photo_url ? <AuctionImage src={player.photo_url} alt="" width={64} height={64} className="h-10 w-10 shrink-0 rounded-lg object-cover sm:h-14 sm:w-14" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 text-lg sm:h-14 sm:w-14 sm:text-xl">🏏</span>}
                  <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-1"><p className="truncate text-xs font-black sm:text-base">{player.full_name}</p><span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase sm:text-[10px] ${player.status === "sold" ? "bg-green-500 text-white" : player.status === "unsold" ? "bg-slate-500 text-white" : "bg-amber-300 text-slate-950"}`}>{player.status}</span></div><p className="truncate text-[10px] text-white/70 sm:text-xs">#{player.player_number} · {player.category}</p><p className="truncate text-[9px] font-bold text-orange-200 sm:text-xs">{buyer ? `${buyer.name} · ${points(player.sold_price)} pts` : "—"}</p></div>
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
