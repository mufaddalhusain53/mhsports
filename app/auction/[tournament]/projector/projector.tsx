"use client";

import { useEffect, useMemo, useState } from "react";
import AuctionImage from "@/app/components/AuctionImage";
import AuctionResultTag from "@/app/auction/AuctionResultTag";
import TeamMark from "@/app/auction/TeamMark";
import SoldFireworks from "../sold-fireworks";
import { sortSponsors } from "@/lib/auction/sponsors";
import { getAuctionBasePrice, upsertAuctionCategory, type AuctionPriceCategory } from "@/lib/auction/pricing";
import type { ProjectorPlayerField } from "@/lib/auction/projector-fields";
import { supabase } from "@/lib/supabase/client";

type Team = { id: string; name: string; slug: string; logo_url: string | null; points_remaining: number; rtm_count: number };
type Player = {
  id: string; player_number: number; full_name: string; category: string; category_id: string | null; role: string | null;
  batting_style: string | null; bowling_style: string | null; previous_team: string | null; photo_url: string | null;
  status: "available" | "sold" | "unsold"; sold_team_id: string | null; sold_price: number | null; rtm_team_id: string | null;
};
type Sponsor = { id: string; name: string; sponsor_title: string | null; logo_url: string | null; display_order: number };
type Tournament = {
  id: string; slug: string; name: string; status: string; points_per_team: number; base_price: number; min_squad_size: number; max_squad_size: number;
  current_player_id: string | null; current_bid: number | null; current_bid_team_id: string | null;
  background_url: string | null; tournament_logo_url: string | null; organizer_logo_urls: string[]; projector_player_fields: ProjectorPlayerField[];
};
type Data = { tournament: Tournament; teams: Team[]; players: Player[]; categories: AuctionPriceCategory[]; sponsors: Sponsor[] };
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
  const [teamSummaryPage, setTeamSummaryPage] = useState(0);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_categories", filter: `tournament_id=eq.${tournamentId}` }, (change) => {
        const row = change.new as AuctionPriceCategory;
        setData((previous) => {
          if (!previous) return previous;
          if (change.eventType === "DELETE") return { ...previous, categories: previous.categories.filter((category) => category.id !== change.old.id) };
          return { ...previous, categories: upsertAuctionCategory(previous.categories, row) };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_sponsors", filter: `tournament_id=eq.${tournamentId}` }, (change) => {
        const row = change.new as Partial<Sponsor>;
        setData((previous) => {
          if (!previous) return previous;
          if (change.eventType === "DELETE") return { ...previous, sponsors: previous.sponsors.filter((sponsor) => sponsor.id !== change.old.id) };
          const exists = previous.sponsors.some((sponsor) => sponsor.id === row.id);
          return { ...previous, sponsors: sortSponsors(exists ? previous.sponsors.map((sponsor) => sponsor.id === row.id ? { ...sponsor, ...row } : sponsor) : [...previous.sponsors, row as Sponsor]) };
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

  useEffect(() => {
    const pageCount = Math.ceil((data?.teams.length ?? 0) / 4);
    if (pageCount <= 1) return;
    const timer = window.setInterval(() => {
      setTeamSummaryPage((page) => (page + 1) % pageCount);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [data?.teams.length]);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (data?.players ?? []).filter((player) =>
      !query || `${player.full_name} ${player.player_number} ${player.category} ${player.status}`.toLocaleLowerCase().includes(query)
    );
  }, [data?.players, search]);
  const categoryValues = useMemo(
    () => Array.from(new Set((data?.players ?? []).map((player) => player.category.trim()).filter((value) => value && value.toUpperCase() !== "NONE"))),
    [data?.players]
  );
  const soldPlayers = useMemo(() => (data?.players ?? []).filter((player) => player.status === "sold"), [data?.players]);

  async function toggleFullscreen() {
    const projector = document.getElementById("auction-projector");
    if (!document.fullscreenElement) await projector?.requestFullscreen();
    else await document.exitFullscreen();
  }

  if (!data) return <main className="grid h-dvh place-items-center overflow-hidden bg-slate-950 p-6 text-center text-white"><p>{error || "Loading projector…"}</p></main>;

  const { tournament, teams, players, categories, sponsors } = data;
  const currentPlayer = players.find((player) => player.id === tournament.current_player_id);
  const currentTeam = teams.find((team) => team.id === tournament.current_bid_team_id);
  const resultTeam = currentPlayer?.status === "sold"
    ? teams.find((team) => team.id === currentPlayer.sold_team_id)
    : undefined;
  const activeTeam = currentTeam ?? resultTeam;
  const activeTeamRoster = activeTeam ? players.filter((player) => player.status === "sold" && player.sold_team_id === activeTeam.id).length : 0;
  const organizerLogos = tournament.organizer_logo_urls ?? [];
  const sponsorLogos = sponsors.filter((sponsor) => sponsor.logo_url);
  const organizerLogo = organizerLogos.length ? organizerLogos[logoIndex % organizerLogos.length] : null;
  const sponsor = sponsorLogos.length ? sponsorLogos[logoIndex % sponsorLogos.length] : null;
  const highestSoldPlayer = soldPlayers.reduce<Player | null>(
    (highest, player) => (player.sold_price ?? 0) > (highest?.sold_price ?? 0) ? player : highest,
    null
  );
  const highestSoldTeam = highestSoldPlayer
    ? teams.find((team) => team.id === highestSoldPlayer.sold_team_id)
    : undefined;
  const teamSummaries = teams.map((team) => ({
    team,
    squadSize: soldPlayers.filter((player) => player.sold_team_id === team.id).length,
  }));
  const summaryPageCount = Math.max(1, Math.ceil(teamSummaries.length / 4));
  const visibleTeamSummaries = teamSummaries.slice((teamSummaryPage % summaryPageCount) * 4, (teamSummaryPage % summaryPageCount) * 4 + 4);
  const shouldDisplayCategory = categoryValues.length > 1;
  const roleValue = currentPlayer ? (currentPlayer.role?.trim() || (shouldDisplayCategory ? currentPlayer.category.trim() : "")) : "";
  const detailCards = currentPlayer ? [
    ...(tournament.projector_player_fields.includes("skill") && roleValue ? [{ label: "Skill", value: roleValue }] : []),
    ...(tournament.projector_player_fields.includes("batting_style") && currentPlayer.batting_style?.trim() ? [{ label: "Batting style", value: currentPlayer.batting_style.trim() }] : []),
    ...(tournament.projector_player_fields.includes("bowling_style") && currentPlayer.bowling_style?.trim() ? [{ label: "Bowling style", value: currentPlayer.bowling_style.trim() }] : []),
    ...(tournament.projector_player_fields.includes("previous_team") && currentPlayer.previous_team?.trim() ? [{ label: "Previous team", value: currentPlayer.previous_team.trim() }] : []),
  ] : [];
  const pageSize = tab === "teams" ? 6 : 12;
  const pageItems = tab === "teams" ? teams : filteredPlayers;
  const pageCount = Math.max(1, Math.ceil(pageItems.length / pageSize));
  const page = listPage % pageCount;
  const visibleTeams = teams.slice(page * pageSize, page * pageSize + pageSize);
  const visiblePlayers = filteredPlayers.slice(page * pageSize, page * pageSize + pageSize);
  const backgroundStyle = tournament.background_url
    ? { backgroundImage: `linear-gradient(rgba(7, 45, 80, 0.16), rgba(8, 60, 100, 0.24)), url("${tournament.background_url.replace(/["\\]/g, "")}")` }
    : undefined;

  return (
    <main id="auction-projector" style={backgroundStyle} className="relative h-dvh w-screen overflow-hidden bg-[#0b3554] bg-cover bg-center p-2 text-white">
      {tab === "live" && currentPlayer?.status === "sold" && <SoldFireworks />}
      <div className="mx-auto flex h-full max-w-[1920px] flex-col gap-0 overflow-hidden rounded-xl bg-[linear-gradient(145deg,rgba(15,76,117,0.42),rgba(22,112,159,0.32)_55%,rgba(9,53,90,0.45))] shadow-[0_0_24px_rgba(125,211,252,0.2)]">
        <header className="grid h-[20dvh] min-h-[150px] max-h-[250px] shrink-0 grid-cols-[1fr_auto_1fr] items-center bg-gradient-to-r from-sky-900/40 via-blue-800/35 to-sky-900/40 px-4 sm:px-6">
          <div className="flex h-full items-center justify-start overflow-hidden">{organizerLogo && <AuctionImage src={organizerLogo} alt="Tournament organizer" width={520} height={520} className="h-[16dvh] max-h-[220px] w-auto max-w-[26vw] object-contain drop-shadow-[0_0_30px_rgba(255,178,80,0.35)]" />}</div>
          <div className="flex min-w-0 items-center justify-center gap-2 text-center sm:gap-4">
            {tournament.tournament_logo_url && <AuctionImage src={tournament.tournament_logo_url} alt="Tournament logo" width={760} height={760} className="h-[18dvh] max-h-[240px] w-auto max-w-[42vw] object-contain drop-shadow-[0_0_36px_rgba(255,178,80,0.4)]" />}
          </div>
          <div className="flex h-full min-w-0 items-center justify-end">
            {sponsor?.logo_url && <div className="flex max-w-full flex-col items-center justify-center">
              {sponsor.sponsor_title && <p className="max-w-full truncate text-center text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200 sm:text-xs">{sponsor.sponsor_title}</p>}
              <div className="mt-1 flex h-[12dvh] max-h-[150px] max-w-full items-center justify-center rounded-lg bg-slate-200/80 px-4 py-1">
                <AuctionImage src={sponsor.logo_url} alt={sponsor.name} width={420} height={160} className="h-[11dvh] max-h-[140px] w-auto max-w-[22vw] object-contain" />
              </div>
              <p className="max-w-full truncate text-center text-[9px] font-bold uppercase tracking-wide text-white/75 sm:text-[10px]">{sponsor.name}</p>
            </div>}
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-hidden rounded-none bg-transparent p-0 relative">
          {tab === "live" && <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,0.9fr)_minmax(0,0.95fr)_minmax(0,2.15fr)] items-stretch gap-3 p-3 sm:gap-4 sm:px-5 sm:pb-5">
            <aside className="flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-blue-900/30 p-3 text-center shadow-[0_0_18px_rgba(125,211,252,0.2)] sm:p-5">
              <p className="rounded-md bg-sky-600/65 px-4 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white sm:text-sm">Bidding team</p>
              {activeTeam ? <>
                <TeamMark name={activeTeam.name} logoUrl={activeTeam.logo_url} size="lg" />
                <h2 className="mt-2 line-clamp-2 text-base font-black uppercase leading-tight text-yellow-300 sm:text-xl">{activeTeam.name}</h2>
                <div className="mt-4 w-full rounded-lg bg-blue-950/45 px-2 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/80 sm:text-[10px]">Max bid</p>
                  <p className="mt-0.5 text-lg font-black leading-none text-yellow-300 sm:text-2xl">{points(maxBid(activeTeam.points_remaining, activeTeamRoster, tournament.min_squad_size, tournament.base_price, activeTeam.rtm_count ?? 0))}</p>
                </div>
                <div className="mt-3 grid w-full grid-cols-3 gap-1 text-center">
                  {([
                    ["Sold", soldPlayers.length, "bg-emerald-500/70"],
                    ["Unsold", players.filter((player) => player.status === "unsold").length, "bg-rose-600/70"],
                    ["Available", players.filter((player) => player.status === "available").length, "bg-sky-700/65"],
                  ] as const).map(([label, value, color]) => <div key={label} className={`${color} rounded-md px-1 py-1.5`}>
                    <p className="text-base font-black leading-none sm:text-xl">{value}</p>
                    <p className="mt-1 text-[8px] font-black uppercase tracking-wide sm:text-[9px]">{label}</p>
                  </div>)}
                </div>
              </> : <p className="mt-4 text-sm font-semibold text-white/75">Waiting for the first bid</p>}
            </aside>

            <div className="flex min-h-0 flex-col items-center justify-center overflow-hidden px-1 text-center">
              {currentPlayer ? <>
                <div className="w-full rounded-lg bg-slate-950/40 px-2 py-2 shadow-[0_0_14px_rgba(16,185,129,0.35)]">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/80 sm:text-xs">
                    {currentPlayer.status === "sold" ? "Sold for" : currentPlayer.status === "unsold" ? "Auction result" : "Player bid"}
                  </p>
                  <p className="mt-0.5 truncate text-xl font-black leading-none text-cyan-200 sm:text-3xl">
                    {currentPlayer.status === "sold" ? points(currentPlayer.sold_price) : currentPlayer.status === "unsold" ? "UNSOLD" : points(tournament.current_bid ?? getAuctionBasePrice(currentPlayer, categories, tournament.base_price))}
                  </p>
                </div>
                <p className="mt-3 text-[9px] font-black uppercase tracking-[0.16em] text-white/80 sm:text-xs">
                  Player #{currentPlayer.player_number}{shouldDisplayCategory ? ` · ${currentPlayer.category}` : ""}
                </p>
                <div className="relative mt-2 rounded-xl bg-slate-950/20 p-1.5 shadow-[0_0_20px_rgba(125,211,252,0.32)] sm:p-2.5">
                  {currentPlayer.photo_url ? <AuctionImage src={currentPlayer.photo_url} alt={currentPlayer.full_name} width={420} height={560} className="h-[38dvh] max-h-[460px] w-[min(34dvh,24vw)] max-w-full rounded-lg object-cover" /> : <div className="grid h-[38dvh] max-h-[460px] w-[min(34dvh,24vw)] max-w-full place-items-center rounded-lg bg-white/10 text-5xl">🏏</div>}
                  {currentPlayer.rtm_team_id && <div className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-950 shadow-md">RTM</div>}
                </div>
              </> : <div className="px-2 text-center">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-cyan-200">{tournament.status === "completed" ? "Auction completed" : "Waiting for next player"}</p>
                <h2 className="mt-3 text-2xl font-black sm:text-4xl">{tournament.status === "completed" ? "Thank you!" : "Get ready"}</h2>
                <p className="mt-2 text-xs text-white/75 sm:text-sm">{tournament.status === "completed" ? `${soldPlayers.length} players sold` : "The next player will appear here as soon as the host calls them."}</p>
              </div>}
            </div>

            <section className="flex min-h-0 flex-col justify-center overflow-hidden rounded-xl bg-blue-900/30 p-4 shadow-[0_0_18px_rgba(125,211,252,0.18)] sm:p-7">
              <h2 className="self-start bg-white/85 px-5 py-2 text-lg font-black uppercase tracking-wide text-blue-950 shadow-[0_0_14px_rgba(125,211,252,0.45)] sm:text-2xl">Player profile</h2>
              {currentPlayer ? <>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-white/20 pb-3">
                  <span className="text-base font-medium uppercase text-white/85 sm:text-2xl">{currentPlayer.full_name.split(/\s+/)[0]}</span>
                  <h3 className="text-2xl font-black uppercase text-yellow-300 sm:text-4xl">{currentPlayer.full_name.split(/\s+/).slice(1).join(" ") || currentPlayer.full_name}</h3>
                </div>
                <div className="mt-2 divide-y divide-white/20">
                  {detailCards.map((detail) => (
                    <div key={detail.label} className="flex items-center justify-between gap-4 py-2 sm:py-2.5">
                      <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.13em] text-cyan-100/85 sm:text-sm">{detail.label}</p>
                      <p className="min-w-0 text-right text-xs font-semibold uppercase text-white sm:text-base">{detail.value}</p>
                    </div>
                  ))}
                </div>
              </> : <p className="mt-4 text-sm text-white/70">Player profile will appear when the next player is called.</p>}
            </section>

            {currentPlayer && currentPlayer.status !== "available" && <div className="pointer-events-none absolute left-[30%] top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"><AuctionResultTag status={currentPlayer.rtm_team_id ? "rtm" : currentPlayer.status} className="!right-auto !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2" /></div>}
          </div>}

          {tab === "teams" && <div className="flex h-full min-h-0 flex-col">
            <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2 xl:grid-cols-3">
              {visibleTeams.map((team) => {
                const roster = soldPlayers.filter((player) => player.sold_team_id === team.id);
                const spent = tournament.points_per_team - team.points_remaining;
                const currentMax = maxBid(team.points_remaining, roster.length, tournament.min_squad_size, tournament.base_price, team.rtm_count ?? 0);
                return <article key={team.id} className="flex min-h-0 items-center gap-3 overflow-hidden rounded-[1rem] bg-slate-950/20 p-3 backdrop-blur-[1px] sm:gap-4 sm:p-4">
                  <TeamMark name={team.name} logoUrl={team.logo_url} size="md" />
                  <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-black uppercase sm:text-xl">{team.name}</h2><p className="mt-1 text-xs text-white/70 sm:text-sm">{roster.length} players</p><p className="mt-1 text-[10px] font-bold text-white/70 sm:text-xs">Spent {points(spent)}</p><p className="mt-1 text-[10px] font-bold text-white/70 sm:text-xs">Max {points(currentMax)}</p></div>
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
                return <article key={player.id} className="flex min-h-0 items-center gap-2 overflow-hidden rounded-[0.9rem] bg-slate-950/20 p-2 backdrop-blur-[1px] sm:gap-3 sm:p-3">
                  {player.photo_url ? <AuctionImage src={player.photo_url} alt="" width={64} height={64} className="h-10 w-10 shrink-0 rounded-lg object-cover sm:h-14 sm:w-14" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 text-lg sm:h-14 sm:w-14 sm:text-xl">🏏</span>}
                  <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-1"><p className="truncate text-xs font-black sm:text-base">{player.full_name}</p><span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase sm:text-[10px] ${player.status === "sold" ? "bg-green-500 text-white" : player.status === "unsold" ? "bg-slate-500 text-white" : "bg-amber-300 text-slate-950"}`}>{player.status}</span></div><p className="truncate text-[10px] text-white/70 sm:text-xs">#{player.player_number}{shouldDisplayCategory ? ` · ${player.category}` : ""}</p><p className="truncate text-[9px] font-bold text-orange-200 sm:text-xs">{buyer ? `${buyer.name} · ${points(player.sold_price)} pts` : "—"}</p></div>
                </article>;
              })}
            </div>
            {pageCount > 1 && <div className="flex shrink-0 items-center justify-center gap-4 pt-2"><button onClick={() => setListPage((page) => (page - 1 + pageCount) % pageCount)} className="rounded-lg bg-white/15 px-4 py-1 text-sm font-black">←</button><span className="text-xs font-bold">Page {page + 1} / {pageCount}</span><button onClick={() => setListPage((page) => (page + 1) % pageCount)} className="rounded-lg bg-white/15 px-4 py-1 text-sm font-black">→</button></div>}
          </div>}
        </section>
        <footer className="flex h-[14dvh] min-h-[88px] max-h-[140px] shrink-0 items-center gap-3 bg-gradient-to-r from-blue-950/55 via-blue-900/45 to-sky-900/40 px-3 shadow-[0_-8px_24px_rgba(56,189,248,0.2)] sm:gap-5 sm:px-6">
          <nav aria-label="Projector controls" className="flex shrink-0 items-center gap-1 rounded-full bg-slate-950/50 p-1.5 backdrop-blur-sm sm:gap-2">
            {([
              ["live", "A"],
              ["teams", "T"],
              ["players", "P"],
              ["fullscreen", "F"],
            ] as const).map(([key, label]) => <button key={key} onClick={() => { if (key === "fullscreen") { void toggleFullscreen(); return; } setTab(key); setListPage(0); }} aria-label={key === "live" ? "Live auction" : key === "teams" ? "Teams" : key === "players" ? "Players" : "Fullscreen"} className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black uppercase transition sm:h-10 sm:w-10 ${key === "fullscreen" ? "bg-orange-400 text-slate-950 shadow-none" : tab === key ? "bg-orange-400 text-slate-950 shadow-none" : "bg-slate-800/70 text-white/90 hover:bg-slate-700"}`}>{label}</button>)}
          </nav>
          <section aria-label="Auction summary" className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <h2 className="shrink-0 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200 sm:text-xs">Auction summary</h2>
              <p className="min-w-0 truncate text-[10px] font-semibold text-white sm:text-xs">
                {highestSoldPlayer
                  ? <>Top sold: <span className="font-black text-yellow-300">{highestSoldPlayer.full_name}</span> · <span className="font-black">{points(highestSoldPlayer.sold_price)} pts</span>{highestSoldTeam ? ` · ${highestSoldTeam.name}` : ""}</>
                  : "Top sold: No players sold yet"}
              </p>
              {summaryPageCount > 1 && <span className="shrink-0 text-[9px] font-bold text-white/60">{(teamSummaryPage % summaryPageCount) + 1}/{summaryPageCount}</span>}
            </div>
            <div className="flex min-w-0 items-stretch gap-2">
              {visibleTeamSummaries.length ? visibleTeamSummaries.map(({ team, squadSize }) => <div key={team.id} className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-white/10 px-2 py-1.5">
                <div className="shrink-0" title={team.name}><TeamMark name={team.name} logoUrl={team.logo_url} size="md" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 text-[8px] font-bold uppercase tracking-wide text-white/70 sm:text-[9px]">
                    <span>Balance</span><span className="text-sm font-black text-yellow-300 sm:text-base">{points(team.points_remaining)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-1 text-[8px] font-bold uppercase tracking-wide text-white/70 sm:text-[9px]">
                    <span>Squad</span><span className="font-black text-white">{squadSize}/{tournament.max_squad_size}</span>
                  </div>
                </div>
              </div>) : <p className="text-xs text-white/70">No teams configured.</p>}
            </div>
          </section>
        </footer>
        {error && <p role="alert" className="fixed bottom-2 left-2 right-2 rounded-lg bg-red-950/90 px-4 py-2 text-sm font-bold text-white">{error}</p>}
      </div>
    </main>
  );
}
