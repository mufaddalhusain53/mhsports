"use client";

import Link from "next/link";
import Image from "next/image";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { preload } from "react-dom";
import AuctionImage from "@/app/components/AuctionImage";
import AuctionResultTag from "@/app/auction/AuctionResultTag";
import DeveloperWatermark from "@/app/auction/DeveloperWatermark";
import PlayerCard from "@/app/auction/PlayerCard";
import TeamMark from "@/app/auction/TeamMark";
import ViewerSelect from "@/app/auction/ViewerSelect";
import { useMainSite } from "@/app/auction/useMainSite";
import SoldFireworks from "./sold-fireworks";
import { sortSponsors } from "@/lib/auction/sponsors";
import { getAuctionBasePrice, upsertAuctionCategory, type AuctionPriceCategory } from "@/lib/auction/pricing";
import { displayPlayerCategory } from "@/lib/auction/player-category";
import { isProjectorPlayerFields, type ProjectorPlayerField } from "@/lib/auction/projector-fields";
import { isViewerSquadView, type ViewerSquadView } from "@/lib/auction/viewer-squad-view";
import { supabase } from "@/lib/supabase/client";

type Team = { id: string; name: string; slug: string; logo_url: string | null; points_remaining: number; rtm_count: number };
type Player = {
  id: string; player_number: number; full_name: string; category: string; category_id: string | null; role: string | null;
  batting_style: string | null; bowling_style: string | null; previous_team: string | null; photo_url: string | null;
  status: "available" | "sold" | "unsold"; sold_team_id: string | null; sold_price: number | null; rtm_team_id: string | null;
};
type Sponsor = { id: string; name: string; sponsor_title: string | null; logo_url: string | null; website_url: string | null; display_order: number };
type Tournament = {
  id: string; slug: string; name: string; status: string; scheduled_date: string | null; rtm_enabled: boolean; points_per_team: number; base_price: number;
  bid_increment: number; min_squad_size: number; max_squad_size: number; current_player_id: string | null;
  current_bid: number | null; current_bid_team_id: string | null; background_url: string | null; tournament_logo_url: string | null;
  organizer_logo_urls: string[]; projector_player_fields: ProjectorPlayerField[]; show_player_category: boolean; viewer_squad_view: ViewerSquadView; updated_at: string;
};
type AuctionData = { tournament: Tournament; teams: Team[]; players: Player[]; categories: AuctionPriceCategory[]; sponsors: Sponsor[] };
type View = "home" | "summary" | "players" | "team";
type PublicScreen = "overview" | "players";
type HomeScreen = PublicScreen | "sponsors";

class AuctionNotFoundError extends Error {}

const inputClass = "mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500";

function formatPoints(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : Number(value).toLocaleString("en-IN");
}

function formatAuctionDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function getReserve(soldCount: number, minSquadSize: number, basePrice: number) {
  return Math.max(minSquadSize - soldCount - 1, 0) * basePrice;
}

function getMaxBid(pointsRemaining: number, soldCount: number, minSquadSize: number, basePrice: number, rtmCount = 0) {
  const reserve = getReserve(soldCount, minSquadSize, basePrice);
  return Math.max(0, pointsRemaining - reserve + rtmCount * basePrice);
}

function EmptySquad({ team }: { team: Team }) {
  return <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-white/20 bg-gradient-to-br from-blue-950/85 to-slate-950/75 px-5 py-8 text-center text-white shadow-lg backdrop-blur-sm">
    <TeamMark name={team.name} logoUrl={team.logo_url} />
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Squad update</p>
      <h3 className="mt-1 text-lg font-black sm:text-xl">No players picked yet</h3>
    </div>
  </div>;
}

function sortSquadByPoints(players: Player[]) {
  return [...players].sort((a, b) => {
    if (a.sold_price === null) return b.sold_price === null ? 0 : 1;
    if (b.sold_price === null) return -1;
    return b.sold_price - a.sold_price;
  });
}

function SquadField({ players, playerFields, rtmEnabled, showCategory }: { players: Player[]; playerFields: ProjectorPlayerField[]; rtmEnabled: boolean; showCategory: boolean }) {
  return <section aria-label="Squad field" className="relative overflow-hidden rounded-3xl border border-emerald-200/40 bg-emerald-900 p-4 shadow-xl sm:p-6" style={{ backgroundImage: "repeating-linear-gradient(90deg, #166534 0, #166534 10%, #1c743d 10%, #1c743d 20%)" }}>
    <div aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-[50%] border-2 border-white/50 sm:inset-5" />
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-14 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-amber-100/60 bg-amber-200/55">
      <div className="absolute inset-x-0 top-4 border-t-2 border-white/70" />
      <div className="absolute inset-x-0 bottom-4 border-t-2 border-white/70" />
    </div>
    <div className="relative z-10 flex min-h-80 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="rounded-full bg-slate-950/75 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">Squad field</p>
        <p className="rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white">{players.length} {players.length === 1 ? "player" : "players"}</p>
      </div>
      {players.length ? <ul className="my-auto grid grid-cols-2 gap-3 py-8 sm:grid-cols-3 2xl:grid-cols-4">
        {players.map((player) => <li key={player.id} className="flex min-w-0 flex-col items-center text-center">
          {player.photo_url ? <AuctionImage src={player.photo_url} alt="" width={64} height={64} className="h-14 w-14 rounded-full border-2 border-white/80 bg-white object-cover shadow-md" /> : <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full border-2 border-white/80 bg-emerald-950 text-2xl shadow-md">🏏</span>}
          <div className="mt-1 w-full rounded-lg bg-slate-950/85 px-2 py-1.5 shadow-md">
            <p className="break-words text-xs font-black text-white [overflow-wrap:anywhere]">#{player.player_number} {player.full_name}</p>
            {showCategory && displayPlayerCategory(player.category) && <p className="text-[10px] font-bold text-cyan-200">Category: {displayPlayerCategory(player.category)}</p>}
            {playerFields.includes("skill") && player.role && <p className="text-[10px] font-semibold text-emerald-100">{player.role}</p>}
            <p className="text-[10px] font-bold text-yellow-300">{formatPoints(player.sold_price)}{rtmEnabled && player.rtm_team_id ? " · RTM" : ""}</p>
          </div>
        </li>)}
      </ul> : <p className="m-auto rounded-xl bg-slate-950/75 px-5 py-3 text-center text-sm font-bold text-white">No players picked yet</p>}
    </div>
  </section>;
}

const AuctionPane = memo(function AuctionPane({ currentPlayer, tournament, teams, categories, currentBidTeam }: {
  currentPlayer: Player | undefined;
  tournament: Tournament;
  teams: Team[];
  categories: AuctionPriceCategory[];
  currentBidTeam: Team | undefined;
}) {
  const playerDetails = currentPlayer ? [
    tournament.projector_player_fields.includes("skill") && currentPlayer.role,
    tournament.projector_player_fields.includes("batting_style") && currentPlayer.batting_style,
    tournament.projector_player_fields.includes("bowling_style") && currentPlayer.bowling_style,
  ].filter(Boolean) : [];
  return <div className="h-[250px] self-start rounded-2xl border border-white/30 bg-slate-950/45 p-5 text-white shadow-lg backdrop-blur-md">
    {currentPlayer && <div className="relative">
      {currentPlayer.status !== "available" && <AuctionResultTag status={tournament.rtm_enabled !== false && currentPlayer.rtm_team_id ? "rtm" : currentPlayer.status} className="right-0 top-0" />}
      <div className="flex items-center gap-3">{currentPlayer.photo_url && <AuctionImage src={currentPlayer.photo_url} alt={currentPlayer.full_name} width={64} height={64} className="h-16 w-16 rounded-lg object-cover" />}<div><p className="text-xl font-black">{currentPlayer.full_name}</p><p className="text-sm text-white/80">#{currentPlayer.player_number}{tournament.show_player_category && displayPlayerCategory(currentPlayer.category) ? ` · Category: ${displayPlayerCategory(currentPlayer.category)}` : ""}</p>{playerDetails.length > 0 && <p className="text-xs text-white/70">{playerDetails.join(" · ")}</p>}{tournament.projector_player_fields.includes("previous_team") && currentPlayer.previous_team && <p className="text-xs text-white/70">Team Last Year ({currentPlayer.previous_team})</p>}</div></div>
      {currentPlayer.status !== "unsold" && <div className="mt-4 flex items-baseline gap-2"><span className="text-3xl font-black">{formatPoints(currentPlayer.status === "sold" ? currentPlayer.sold_price : tournament.current_bid ?? getAuctionBasePrice(currentPlayer, categories, tournament.base_price))}</span><span className="text-sm font-bold text-white/75">points</span></div>}
      {currentBidTeam && currentPlayer.status === "available" ? <div className="mt-2 flex items-center gap-2 text-sm font-bold text-white/90"><TeamMark name={currentBidTeam.name} logoUrl={currentBidTeam.logo_url} size="sm" /><span>{currentBidTeam.name}</span></div> : <p className="mt-1 text-sm text-white/80">{currentPlayer.status === "sold" ? `Sold to ${teams.find((item) => item.id === currentPlayer.sold_team_id)?.name ?? "team"}` : currentPlayer.status === "unsold" ? "" : "No bids yet"}</p>}
    </div>}
    {!currentPlayer && tournament.status === "setup" && tournament.scheduled_date && <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-200">Auction scheduled for</p>
      <p className="mt-2 text-2xl font-black">{formatAuctionDate(tournament.scheduled_date)}</p>
    </div>}
  </div>;
});

function AuctionHomeViewer({ tournament, teams, players, priceCategories, sponsors, refreshMessage }: {
  tournament: Tournament;
  teams: Team[];
  players: Player[];
  priceCategories: AuctionPriceCategory[];
  sponsors: Sponsor[];
  refreshMessage: string;
}) {
  const [screen, setScreen] = useState<HomeScreen>("overview");
  const [selectedTeamSlug, setSelectedTeamSlug] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [activeBottomTab, setActiveBottomTab] = useState<"home" | "sponsor">("home");
  const soldPlayers = useMemo(() => players.filter((player) => player.status === "sold"), [players]);
  const categories = useMemo(
    () => Array.from(new Set(players.map((player) => player.category.trim()).filter((value) => value && value.toUpperCase() !== "NONE"))).sort(),
    [players]
  );
  const selectedTeam = teams.find((team) => team.slug === selectedTeamSlug);
  const currentPlayer = players.find((player) => player.id === tournament.current_player_id);
  const currentBidTeam = teams.find((team) => team.id === tournament.current_bid_team_id);
  const playerTeam = currentPlayer?.status === "sold"
    ? teams.find((team) => team.id === currentPlayer.sold_team_id)
    : currentPlayer?.status === "available" ? currentBidTeam : undefined;
  const organizerLogo = tournament.organizer_logo_urls?.[0];
  const availableCount = players.filter((player) => player.status === "available").length;
  const unsoldCount = players.filter((player) => player.status === "unsold").length;
  const teamRows = useMemo(() => teams.map((team) => ({
    team,
    roster: soldPlayers.filter((player) => player.sold_team_id === team.id),
  })).sort((a, b) => a.team.name.localeCompare(b.team.name)), [teams, soldPlayers]);
  const selectedRosterSize = selectedTeam ? soldPlayers.filter((player) => player.sold_team_id === selectedTeam.id).length : 0;
  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matches = players.filter((player) => {
      if (screen === "overview" && selectedTeam) return player.status === "sold" && player.sold_team_id === selectedTeam.id;
      const matchesStatus = filterStatus === "all" || player.status === filterStatus;
      const matchesCategory = filterCategory === "all" || player.category === filterCategory;
      const matchesSearch = !query || `${player.full_name} ${player.player_number} ${player.category}`.toLocaleLowerCase().includes(query);
      return matchesStatus && matchesCategory && matchesSearch;
    });
    return screen === "overview" && selectedTeam ? sortSquadByPoints(matches) : matches;
  }, [players, filterCategory, filterStatus, search, screen, selectedTeam]);
  const backgroundStyle = tournament.background_url
    ? { backgroundImage: `linear-gradient(rgba(7, 45, 80, 0.16), rgba(8, 60, 100, 0.24)), url("${tournament.background_url.replace(/["\\]/g, "")}")` }
    : undefined;

  function showSponsors() {
    setActiveBottomTab("sponsor");
    setScreen("sponsors");
    setSelectedTeamSlug("");
    document.getElementById("home-auction-content")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showHome() {
    setActiveBottomTab("home");
    setScreen("overview");
    setSelectedTeamSlug("");
    document.getElementById("home-auction-content")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main style={backgroundStyle} className="relative flex h-dvh min-h-[560px] w-screen flex-col overflow-hidden bg-[#dbeafe] bg-cover bg-center text-white">
      {screen !== "sponsors" && currentPlayer?.status === "sold" && <SoldFireworks />}
      {refreshMessage && <p role="status" className="absolute bottom-20 left-1/2 z-30 w-max max-w-[90%] -translate-x-1/2 rounded-lg bg-slate-950 px-3 py-2 text-center text-xs font-bold text-white shadow-lg">{refreshMessage}</p>}
      <div className={`mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col p-2 ${screen === "sponsors" ? "gap-2 sm:p-3" : "gap-2 sm:gap-3 sm:p-3 lg:flex-row"}`}>
        {screen !== "sponsors" && <aside className="grid h-fit shrink-0 grid-cols-1 gap-2 lg:w-[45%] lg:min-w-[320px] lg:grid-rows-[auto_auto] lg:content-start lg:gap-3 lg:self-start xl:w-[36%]">
          <section className="flex min-w-0 items-center justify-between gap-2 overflow-hidden rounded-xl bg-blue-900/55 px-3 py-2 shadow-lg backdrop-blur-sm sm:px-5">
            {tournament.tournament_logo_url && <AuctionImage src={tournament.tournament_logo_url} alt={`${tournament.name} logo`} width={112} height={112} className="h-16 w-16 shrink-0 object-contain sm:h-28 sm:w-28" />}
            <h1 className="min-w-0 flex-1 text-center text-[clamp(0.75rem,2.7vw,1rem)] font-black uppercase leading-tight tracking-wide text-white [overflow-wrap:anywhere] sm:text-base lg:text-xl">{tournament.name}</h1>
            {organizerLogo && <AuctionImage src={organizerLogo} alt="Tournament organizer" width={112} height={112} className="h-16 w-16 shrink-0 object-contain sm:h-28 sm:w-28" />}
          </section>

          <section className="flex min-w-0 flex-col justify-center rounded-xl border border-white/15 bg-gradient-to-br from-blue-950/80 via-blue-900/70 to-indigo-950/80 p-2 text-center shadow-lg backdrop-blur-sm sm:p-5 lg:justify-start">
            <p className="inline-flex items-center gap-1.5 self-center rounded-full border border-white/15 bg-slate-950/35 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/90 sm:text-xs">
              {tournament.status === "live" && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
              {tournament.status === "completed" ? "Auction completed" : tournament.status === "live" ? "Auction is live" : tournament.status === "paused" ? "Auction paused" : "Auction schedule"}
            </p>
            {tournament.status === "setup" && <div className="mt-3 rounded-lg bg-blue-950/40 px-2 py-3 text-yellow-300 sm:mt-5 sm:px-4 sm:py-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/75 sm:text-xs">{tournament.scheduled_date ? "Auction date" : "Current status"}</p>
              <p className="mt-1 text-base font-black sm:text-2xl">{tournament.scheduled_date ? formatAuctionDate(tournament.scheduled_date) : tournament.status.toUpperCase()}</p>
            </div>}
            {currentPlayer && <div className={`mt-3 grid min-w-0 items-center gap-2 text-left sm:mt-5 sm:gap-4 ${playerTeam ? "grid-cols-[clamp(5rem,24vw,6.5rem)_minmax(0,1fr)_clamp(5rem,24vw,6.5rem)] sm:grid-cols-[112px_minmax(0,1fr)_112px] lg:grid-cols-[128px_minmax(0,1fr)_128px] 2xl:grid-cols-[144px_minmax(0,1fr)_144px]" : "grid-cols-[clamp(5rem,24vw,6.5rem)_minmax(0,1fr)] sm:grid-cols-[112px_minmax(0,1fr)] lg:grid-cols-[128px_minmax(0,1fr)] 2xl:grid-cols-[144px_minmax(0,1fr)]"}`}>
              <div className="relative">
                {currentPlayer.photo_url ? <AuctionImage src={currentPlayer.photo_url} alt="" width={144} height={144} className="h-[clamp(5rem,24vw,6.5rem)] w-[clamp(5rem,24vw,6.5rem)] rounded-lg border border-white/25 object-cover shadow-md sm:h-28 sm:w-28 lg:h-32 lg:w-32 2xl:h-36 2xl:w-36" /> : <div className="grid h-[clamp(5rem,24vw,6.5rem)] w-[clamp(5rem,24vw,6.5rem)] place-items-center rounded-lg border border-white/20 bg-white/10 text-2xl font-black shadow-md sm:h-28 sm:w-28 sm:text-3xl lg:h-32 lg:w-32 2xl:h-36 2xl:w-36">{currentPlayer.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>}
                <span className="absolute left-0 top-0 -translate-y-1/2 rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-black text-slate-950 shadow-md sm:text-sm">#{currentPlayer.player_number}</span>
                {currentPlayer.status !== "available" && <AuctionResultTag status={tournament.rtm_enabled !== false && currentPlayer.status === "sold" && currentPlayer.rtm_team_id ? "rtm" : currentPlayer.status} className="!left-1/2 !right-auto !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !border-2 !px-1 !py-1 !text-[10px] !tracking-normal sm:!px-2 sm:!text-lg" />}
              </div>
              <div className="min-w-0 text-center">
                <p className="break-words text-xl font-black leading-tight text-white [overflow-wrap:anywhere] sm:text-2xl 2xl:text-3xl">{currentPlayer.full_name}</p>
                {!playerTeam && currentPlayer.status !== "unsold" && <p className="break-words text-base font-black leading-tight text-yellow-300 [overflow-wrap:anywhere] sm:text-xl lg:text-2xl">
                  <span className="whitespace-nowrap">{currentPlayer.status === "sold" ? "Sold for: " : tournament.current_bid_team_id ? "Current bid: " : "Base Points: "}</span>
                  <span>{formatPoints(currentPlayer.status === "sold" ? currentPlayer.sold_price : tournament.current_bid ?? getAuctionBasePrice(currentPlayer, priceCategories, tournament.base_price))}</span>
                </p>}
                {currentPlayer.status === "sold" && playerTeam && <p className="break-words text-[10px] font-bold leading-tight text-white/90 sm:text-xs">Sold to: {playerTeam.name}</p>}
                <dl className="mt-1 flex flex-wrap justify-center gap-1">
                  {tournament.show_player_category && displayPlayerCategory(currentPlayer.category) && <div className="inline-flex max-w-full flex-wrap items-baseline gap-x-1 rounded-md border border-cyan-300/30 bg-cyan-950/60 px-1.5 py-0.5 leading-tight">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-cyan-200 sm:text-xs">Category</dt>
                    <dd className="break-words text-sm font-black text-white [overflow-wrap:anywhere]">{displayPlayerCategory(currentPlayer.category)}</dd>
                  </div>}
                  {tournament.projector_player_fields.includes("skill") && currentPlayer.role?.trim() && <div className="inline-flex max-w-full flex-wrap items-baseline gap-x-1 rounded-md border border-white/20 bg-slate-950/45 px-1.5 py-0.5 leading-tight">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-blue-200 sm:text-xs">Player Role</dt>
                    <dd className="break-words text-sm font-bold text-white [overflow-wrap:anywhere]">{currentPlayer.role}</dd>
                  </div>}
                  {tournament.projector_player_fields.includes("previous_team") && currentPlayer.previous_team?.trim() && <div className="inline-flex max-w-full flex-wrap items-baseline gap-x-1 rounded-md border border-white/20 bg-slate-950/45 px-1.5 py-0.5 leading-tight">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-blue-200 sm:text-xs">Previous team</dt>
                    <dd className="break-words text-sm font-bold text-white [overflow-wrap:anywhere]">{currentPlayer.previous_team}</dd>
                  </div>}
                </dl>
              </div>
              {playerTeam && <div className="flex min-w-0 flex-col items-center gap-1">
                <TeamMark name={playerTeam.name} logoUrl={playerTeam.logo_url} size="viewer" />
                {currentPlayer.status !== "unsold" && <div className="w-full rounded-lg bg-slate-950/45 px-1 py-1 text-center">
                  <p className="whitespace-nowrap text-[clamp(0.55rem,2.4vw,0.75rem)] font-bold uppercase text-white/70 sm:text-xs">{currentPlayer.status === "sold" ? "Sold for" : tournament.current_bid === null ? "Base Points" : "Current bid"}</p>
                  <p className="break-words text-lg font-black leading-tight text-yellow-300 [overflow-wrap:anywhere] sm:text-xl lg:text-2xl">{formatPoints(currentPlayer.status === "sold" ? currentPlayer.sold_price : tournament.current_bid ?? getAuctionBasePrice(currentPlayer, priceCategories, tournament.base_price))}</p>
                </div>}
              </div>}
            </div>}
          </section>
          <div className="mx-auto hidden w-fit rounded-xl bg-blue-950/80 px-3 py-2 shadow-lg lg:block">
            <DeveloperWatermark />
          </div>
        </aside>}

        <section className={`flex min-h-0 min-w-0 flex-1 flex-col gap-2 sm:gap-3 ${screen === "sponsors" ? "w-full" : ""}`}>
          {screen !== "sponsors" && <header className="relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-900/55 px-3 py-2 shadow-lg backdrop-blur-sm sm:gap-4 sm:px-4">
            <nav className="flex rounded-full bg-slate-950/45 p-1" aria-label="Auction viewer screens">
              {(["overview", "players"] as const).map((tab) => <button key={tab} type="button" onClick={() => { setScreen(tab); setSelectedTeamSlug(""); }} aria-current={screen === tab ? "page" : undefined} className={`rounded-full px-3 py-2 text-[10px] font-black uppercase transition sm:px-5 sm:text-sm ${screen === tab ? "bg-yellow-400 text-slate-950" : "text-white hover:bg-white/10"}`}>{tab === "overview" ? "Teams" : "Players"}</button>)}
            </nav>
            <div className="flex flex-wrap items-center gap-1.5">
              {([["Sold", soldPlayers.length, "bg-green-600"], ["Unsold", unsoldCount, "bg-red-500"], ["Avl", availableCount, "bg-amber-500"]] as const).map(([label, count, color]) => <span key={label} className={`${color} rounded-full px-2.5 py-1 text-[9px] font-black uppercase text-white sm:px-3 sm:text-xs`}>{label} · {count}</span>)}
            </div>
          </header>}

          {screen === "players" && <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2 rounded-xl bg-blue-900/50 p-2.5 shadow-md backdrop-blur-sm sm:p-3">
            {([["all", "All"], ["sold", "Sold"], ["unsold", "Unsold"], ["available", "Avl"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilterStatus(value)} className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase sm:text-xs ${filterStatus === value ? "bg-yellow-400 text-slate-950" : "bg-slate-950/35 text-white"}`}>{label}</button>)}
            <ViewerSelect label="Filter players by category" value={filterCategory} onChange={setFilterCategory} options={[
              { value: "all", label: "All categories" },
              ...categories.map((category) => ({ value: category, label: category })),
            ]} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search players" className="h-8 min-w-28 flex-1 rounded-full bg-slate-950/35 px-3 text-[10px] text-white outline-none placeholder:text-white/60 sm:text-xs" />
            <span className="whitespace-nowrap rounded-full bg-slate-950/35 px-3 py-2 text-[10px] font-black text-white sm:text-xs">{filteredPlayers.length} / {players.length} players</span>
          </div>}

          <div id="home-auction-content" className="min-h-0 flex-1 overflow-y-auto pr-1">
            {screen === "overview" && !selectedTeam && <div className="grid gap-2 sm:grid-cols-2">
              {teamRows.map(({ team, roster }) => {
                const maxBid = getMaxBid(team.points_remaining, roster.length, tournament.min_squad_size, tournament.base_price, team.rtm_count ?? 0);
                return <button type="button" key={team.id} onClick={() => setSelectedTeamSlug(team.slug)} className="flex min-w-0 items-center gap-2 rounded-xl bg-blue-900/50 p-2.5 text-left shadow-md backdrop-blur-sm transition hover:bg-blue-900/70 focus:outline-none focus:ring-2 focus:ring-yellow-400 sm:gap-3 sm:p-3">
                  <TeamMark name={team.name} logoUrl={team.logo_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-black uppercase text-white sm:text-sm">{team.name}</p>
                    <p className="mt-1 text-lg font-black leading-none text-yellow-300 sm:text-2xl">{roster.length}</p>
                    <p className="mt-1 text-[9px] font-bold text-white/90 sm:text-xs">Max {formatPoints(maxBid)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-black text-yellow-300 sm:text-xl">{formatPoints(team.points_remaining)}</p>
                    {tournament.rtm_enabled !== false && <p className="mt-1 text-[9px] font-bold text-green-400 sm:text-xs">RTM {team.rtm_count ?? 0}</p>}
                  </div>
                </button>;
              })}
            </div>}

            {screen === "overview" && selectedTeam && <section>
              <div className="mb-2 flex flex-wrap items-center gap-3 rounded-xl bg-blue-900/50 p-3 shadow-md backdrop-blur-sm">
                <div className="flex min-w-0 flex-[1_1_18rem] items-center gap-3">
                  <button type="button" onClick={() => setSelectedTeamSlug("")} className="shrink-0 rounded-lg bg-slate-950/40 px-3 py-2 text-xs font-bold text-white">← Teams</button>
                  <TeamMark name={selectedTeam.name} logoUrl={selectedTeam.logo_url} size="sm" />
                  <h2 className="min-w-0 flex-1 break-words text-sm font-black uppercase sm:text-lg">{selectedTeam.name}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold sm:text-sm">
                  <span>Reserve: {formatPoints(getReserve(selectedRosterSize, tournament.min_squad_size, tournament.base_price))}</span>
                  <span>Max bid: {formatPoints(getMaxBid(selectedTeam.points_remaining, selectedRosterSize, tournament.min_squad_size, tournament.base_price, selectedTeam.rtm_count ?? 0))}</span>
                  <span className="font-black text-yellow-300">Balance: {formatPoints(selectedTeam.points_remaining)}</span>
                </div>
              </div>
              {tournament.viewer_squad_view === "field" ? <SquadField players={filteredPlayers} playerFields={tournament.projector_player_fields} rtmEnabled={tournament.rtm_enabled !== false} showCategory={tournament.show_player_category} /> : filteredPlayers.length ? <div className="grid gap-2 sm:grid-cols-2">{filteredPlayers.map((player) => <PlayerCard key={player.id} player={player} teams={teams} rtmEnabled={tournament.rtm_enabled !== false} playerFields={tournament.projector_player_fields} showCategory={tournament.show_player_category} />)}</div> : <EmptySquad team={selectedTeam} />}
            </section>}

            {screen === "players" && <section>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{filteredPlayers.map((player) => <PlayerCard key={player.id} player={player} teams={teams} rtmEnabled={tournament.rtm_enabled !== false} playerFields={tournament.projector_player_fields} showCategory={tournament.show_player_category} />)}</div>
            </section>}

            {screen === "sponsors" && (sponsors.length > 0 ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {sponsors.map((sponsor) => <a key={sponsor.id} href={sponsor.website_url || undefined} target={sponsor.website_url ? "_blank" : undefined} rel={sponsor.website_url ? "noreferrer" : undefined} aria-label={`${sponsor.sponsor_title ? `${sponsor.sponsor_title}: ` : ""}${sponsor.name}`} className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl bg-slate-200/85 p-4 text-center text-slate-900 shadow-md backdrop-blur-sm sm:min-h-56">
                {sponsor.sponsor_title && <p className="max-w-full truncate text-xs font-black uppercase tracking-wide text-slate-600 sm:text-sm">{sponsor.sponsor_title}</p>}
                {sponsor.logo_url ? <AuctionImage src={sponsor.logo_url} alt={sponsor.name} width={160} height={160} className="h-28 w-28 object-contain sm:h-36 sm:w-36" /> : <p className="text-lg font-black">{sponsor.name}</p>}
                {sponsor.logo_url && <p className="max-w-full truncate text-sm font-black sm:text-base">{sponsor.name}</p>}
              </a>)}
            </div> : <p className="text-center text-sm text-white/75">No sponsors have been added yet.</p>)}
          </div>
        </section>
      </div>

      {screen !== "sponsors" && sponsors.length > 0 && <section aria-label="Tournament sponsors" className="flex shrink-0 items-center gap-2 bg-blue-950/90 px-2 py-1.5 sm:px-4">
        <h2 className="shrink-0 text-[9px] font-black uppercase tracking-wide text-white/80 sm:text-xs">Sponsors</h2>
        <div className="sponsor-strip min-w-0 flex-1">
          <div className="sponsor-strip-track" style={{ animationDuration: `${Math.max(20, sponsors.length * 5)}s` }}>
            {[false, true].map((duplicate) => <div key={String(duplicate)} className={`sponsor-strip-group${duplicate ? " sponsor-strip-duplicate" : ""}`} aria-hidden={duplicate || undefined}>
              {sponsors.map((sponsor) => <a key={sponsor.id} href={sponsor.website_url || undefined} target={sponsor.website_url ? "_blank" : undefined} rel={sponsor.website_url ? "noreferrer" : undefined} tabIndex={duplicate ? -1 : undefined} aria-label={`${sponsor.sponsor_title ? `${sponsor.sponsor_title}: ` : ""}${sponsor.name}`} className="flex h-12 max-w-56 shrink-0 items-center gap-2 rounded-lg bg-slate-200/95 px-3 text-slate-900 lg:h-24 lg:max-w-80">
                {sponsor.logo_url && <AuctionImage src={sponsor.logo_url} alt="" width={80} height={80} className="h-10 w-10 shrink-0 object-contain lg:h-20 lg:w-20" />}
                <span className="min-w-0">
                  {sponsor.sponsor_title && <span className="block truncate text-[9px] font-black uppercase tracking-wide text-slate-600">{sponsor.sponsor_title}</span>}
                  <span className="block truncate text-xs font-black">{sponsor.name}</span>
                </span>
              </a>)}
            </div>)}
          </div>
        </div>
      </section>}

      <div className={`shrink-0 bg-blue-950/95 py-1 ${screen === "sponsors" ? "" : "lg:hidden"}`}><DeveloperWatermark /></div>
      <nav className="z-20 flex h-[68px] shrink-0 items-center justify-center gap-8 bg-blue-950/95 px-4 shadow-[0_-8px_24px_rgba(15,23,42,0.2)] sm:h-[74px] sm:gap-16" aria-label="Viewer navigation">
        <button type="button" onClick={showHome} className={`flex min-w-16 flex-col items-center gap-1 text-[10px] font-black uppercase ${activeBottomTab === "home" ? "text-yellow-300" : "text-slate-300"}`}><span aria-hidden="true" className="text-xl leading-none">⌂</span>Home</button>
        <button type="button" onClick={showSponsors} className={`flex min-w-16 flex-col items-center gap-1 text-[10px] font-black uppercase ${activeBottomTab === "sponsor" ? "text-yellow-300" : "text-slate-300"}`}><span aria-hidden="true" className="text-xl leading-none">★</span>Sponsor</button>
      </nav>
    </main>
  );
}

export default function AuctionPublic({ slug, view, teamSlug, loadingLogoUrl }: { slug: string; view: View; teamSlug?: string; loadingLogoUrl?: string }) {
  const isMainSite = useMainSite();
  const auctionUrl = `/api/auctions/${encodeURIComponent(slug)}`;
  preload(auctionUrl, { as: "fetch", crossOrigin: "anonymous" });
  const requestRef = useRef<{ url: string; promise: Promise<AuctionData> } | null>(null);
  const [data, setData] = useState<AuctionData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [screen, setScreen] = useState<PublicScreen>(view === "players" ? "players" : "overview");
  const [selectedTeamSlug, setSelectedTeamSlug] = useState(teamSlug ?? "");

  useEffect(() => {
    let active = true;
    const storageKey = `auction-viewer-v1:${slug}`;
    if (view === "home") {
      void Promise.resolve().then(() => {
        if (!active) return;
        try {
          const saved = sessionStorage.getItem(storageKey);
          if (!saved) return;
          const snapshot: AuctionData = JSON.parse(saved);
          if (snapshot?.tournament?.slug === slug && typeof snapshot.tournament.show_player_category === "boolean" && isProjectorPlayerFields(snapshot.tournament.projector_player_fields) && isViewerSquadView(snapshot.tournament.viewer_squad_view) && Array.isArray(snapshot.teams) && Array.isArray(snapshot.players) && Array.isArray(snapshot.categories) && Array.isArray(snapshot.sponsors)) {
            setData(snapshot);
          } else {
            console.warn("Ignoring an invalid saved auction view.");
            sessionStorage.removeItem(storageKey);
          }
        } catch (reason) {
          console.warn("Unable to restore the saved auction view.", reason);
        }
      });
    }
    let request = requestRef.current;
    if (!request || request.url !== auctionUrl) {
      request = { url: auctionUrl, promise: fetch(auctionUrl).then(async (response) => {
        const result = await response.json();
        if (response.status === 404) throw new AuctionNotFoundError(result.error || "Auction not found.");
        if (!response.ok) throw new Error(result.error || "Unable to load this auction.");
        return result;
      }) };
      requestRef.current = request;
    }
    request.promise
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          if (reason instanceof AuctionNotFoundError) {
            setData(null);
            try {
              sessionStorage.removeItem(storageKey);
            } catch (storageError) {
              console.warn("Unable to remove the saved auction view.", storageError);
            }
          }
          setError(reason instanceof Error ? reason.message : "Unable to load this auction.");
        }
      })
      .finally(() => {
        if (requestRef.current === request) requestRef.current = null;
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [auctionUrl, slug, view]);

  useEffect(() => {
    if (view !== "home" || loading || error || !data || data.tournament.slug !== slug) return;
    try {
      sessionStorage.setItem(`auction-viewer-v1:${slug}`, JSON.stringify(data));
    } catch (reason) {
      console.warn("Unable to save the auction view for refresh.", reason);
    }
  }, [data, error, loading, slug, view]);

  useEffect(() => {
    if (loading || error || !data?.tournament.id) return;
    const tournamentId = data.tournament.id;
    const channel = supabase.channel(`public-auction-${tournamentId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "auction_tournaments", filter: `slug=eq.${slug}` }, ({ new: row }) => {
        setData((previous) => previous ? { ...previous, tournament: { ...previous.tournament, ...(row as Partial<Tournament>) } } : previous);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_teams", filter: `tournament_id=eq.${tournamentId}` }, (change) => {
        const row = change.new as Partial<Team>;
        setData((previous) => {
          if (!previous) return previous;
          if (change.eventType === "DELETE") return { ...previous, teams: previous.teams.filter((item) => item.id !== change.old.id) };
          return { ...previous, teams: previous.teams.map((item) => item.id === row.id ? { ...item, ...row } : item) };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_players", filter: `tournament_id=eq.${tournamentId}` }, (change) => {
        const row = change.new as Partial<Player>;
        setData((previous) => {
          if (!previous) return previous;
          if (change.eventType === "DELETE") return { ...previous, players: previous.players.filter((item) => item.id !== change.old.id) };
          return { ...previous, players: previous.players.map((item) => item.id === row.id ? { ...item, ...row } : item) };
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
          if (change.eventType === "DELETE") return { ...previous, sponsors: previous.sponsors.filter((item) => item.id !== change.old.id) };
          const exists = previous.sponsors.some((item) => item.id === row.id);
          return { ...previous, sponsors: sortSponsors(exists ? previous.sponsors.map((item) => item.id === row.id ? { ...item, ...row } : item) : [...previous.sponsors, row as Sponsor]) };
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [data?.tournament.id, error, loading, slug]);

  const team = data?.teams.find((item) => item.slug === selectedTeamSlug);
  const currentPlayer = data?.players.find((player) => player.id === data.tournament.current_player_id);
  const currentBidTeam = data?.teams.find((item) => item.id === data.tournament.current_bid_team_id);
  const filteredSoldPlayers = useMemo(() => (data?.players ?? []).filter((player) => player.status === "sold"), [data?.players]);
  const filteredAvailableCount = useMemo(() => (data?.players ?? []).filter((player) => player.status === "available").length, [data?.players]);
  const categories = useMemo(() => Array.from(new Set((data?.players ?? []).map((player) => player.category.trim()).filter((value) => value && value.toUpperCase() !== "NONE"))).sort(), [data?.players]);
  const filteredPlayers = useMemo(() => {
    const players = data?.players ?? [];
    const query = search.trim().toLocaleLowerCase();
    const matches = players.filter((player) => {
      if (screen === "overview" && team) return player.status === "sold" && player.sold_team_id === team.id;
      const matchesStatus = filterStatus === "all" || player.status === filterStatus;
      const matchesCategory = filterCategory === "all" || player.category === filterCategory;
      const matchesSearch = !query || `${player.full_name} ${player.player_number} ${player.category}`.toLocaleLowerCase().includes(query);
      return matchesStatus && matchesCategory && matchesSearch;
    });
    return screen === "overview" && team ? sortSquadByPoints(matches) : matches;
  }, [data?.players, filterCategory, filterStatus, search, screen, team]);

  if (!data && loading) return <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 px-6">
    <Image src={loadingLogoUrl || `/api/auctions/${encodeURIComponent(slug)}/logo`} alt="Auction logo" width={192} height={192} preload unoptimized className={`h-40 w-40 object-contain drop-shadow-lg sm:h-48 sm:w-48 ${!loadingLogoUrl || loadingLogoUrl === "/beyond-auctions-logo.png" ? "rounded-2xl bg-stone-50 p-3" : ""}`} />
    <div role="progressbar" aria-label="Loading auction" className="h-2 w-56 max-w-full overflow-hidden rounded-full bg-white/25">
      <div className="h-full w-1/3 rounded-full bg-yellow-400 motion-safe:animate-[auction-loading-bar_1.4s_ease-in-out_infinite] motion-reduce:mx-auto" />
    </div>
  </main>;
  if (!data) return <main className="min-h-screen bg-slate-50 px-4 py-20 text-center"><p className="font-bold text-red-700">{error || "Auction not found."}</p><Link href="/auction" className="mt-4 inline-block font-bold text-orange-700">Back to auctions</Link></main>;

  const { tournament, teams, players, categories: priceCategories, sponsors } = data;
  const soldPlayers = filteredSoldPlayers;
  const activePlayers = filteredAvailableCount;

  if (view === "home") {
    return <AuctionHomeViewer tournament={tournament} teams={teams} players={players} priceCategories={priceCategories} sponsors={sponsors} refreshMessage={loading ? "Updating auction data…" : error ? `Showing saved data. ${error}` : ""} />;
  }

  const pageBackground = tournament.background_url
    ? { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.34), rgba(15, 23, 42, 0.42)), url("${tournament.background_url.replace(/["\\]/g, "")}")` }
    : undefined;

  return (
    <main style={pageBackground} className="min-h-screen bg-slate-100 bg-cover bg-fixed bg-center text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-8">
          <Link href="/auction" className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700">{isMainSite ? "MH Sports · Auctions" : "Auctions"}</Link>
          <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="flex items-center gap-4">{tournament.tournament_logo_url && <AuctionImage src={tournament.tournament_logo_url} alt={`${tournament.name} logo`} width={72} height={72} className="h-14 w-14 shrink-0 rounded-lg object-contain" />}<div><h1 className="text-3xl font-black sm:text-4xl">{tournament.name}</h1><p className="mt-1 text-sm text-slate-600">Live auction board · read-only</p></div></div>
            <span className="w-fit rounded-full bg-orange-100 px-3 py-1.5 text-xs font-black uppercase text-orange-800">{tournament.status}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-8">
        <nav className="mb-6 flex flex-wrap gap-2" aria-label="Auction viewer screens">
          {(["overview", "players"] as const).map((tab) => {
            const active = screen === tab;
            const label = tab === "overview" ? "Overview" : "Players";
            return <button key={tab} type="button" onClick={() => { setScreen(tab); setSelectedTeamSlug(""); }} aria-current={active ? "page" : undefined} className={`rounded-full border px-4 py-2 text-xs font-black uppercase transition-colors ${active ? "border-orange-400 bg-orange-400 text-slate-950" : "border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800"}`}>{label}</button>;
          })}
          {[['Sold', soldPlayers.length, 'border-green-300 bg-green-50 text-green-800'], ['Unsold', players.filter((player) => player.status === 'unsold').length, 'border-red-200 bg-red-50 text-red-700'], ['Avl', activePlayers, 'border-slate-300 bg-slate-100 text-slate-700']].map(([label, value, colors]) => <span key={String(label)} className={`inline-flex items-center rounded-full border px-3 py-2 text-xs font-black uppercase ${colors}`}><strong className="mr-1">{value}</strong>{label}</span>)}
        </nav>
        {currentPlayer && !currentPlayer.id && <section className="relative mb-6 rounded-2xl border border-orange-300 bg-orange-50 p-5 shadow-sm">
          {currentPlayer.status !== "available" && <AuctionResultTag status={tournament.rtm_enabled !== false && currentPlayer.rtm_team_id ? "rtm" : currentPlayer.status} />}
          <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">{currentPlayer.photo_url && <AuctionImage src={currentPlayer.photo_url} alt={`${currentPlayer.full_name}`} width={80} height={80} className="h-20 w-20 rounded-xl object-cover" />}<div><h2 className="text-2xl font-black">{currentPlayer.full_name}</h2><p className="mt-1 text-sm text-slate-700">#{currentPlayer.player_number}{tournament.show_player_category && displayPlayerCategory(currentPlayer.category) ? ` · Category: ${displayPlayerCategory(currentPlayer.category)}` : ""}{tournament.projector_player_fields.includes("skill") && currentPlayer.role ? ` · ${currentPlayer.role}` : ""}</p></div></div>
            <div className="sm:text-right">{currentPlayer.status !== "unsold" && <p className="text-2xl font-black">{currentPlayer.status === "sold" ? formatPoints(currentPlayer.sold_price) : formatPoints(tournament.current_bid ?? getAuctionBasePrice(currentPlayer, priceCategories, tournament.base_price))}</p>}<p className="text-sm text-slate-600">{currentPlayer.status === "sold" ? `Sold to ${teams.find((item) => item.id === currentPlayer.sold_team_id)?.name ?? "team"}` : currentPlayer.status === "unsold" ? "" : currentBidTeam ? currentBidTeam.name : "No bids yet"}</p></div>
          </div>
        </section>}

        {screen === "overview" && !team && <section className="grid gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.65fr)]">
          <div className="grid gap-4">
            <AuctionPane currentPlayer={currentPlayer} tournament={tournament} teams={teams} categories={priceCategories} currentBidTeam={currentBidTeam} />
            {currentPlayer && !currentPlayer.id && <div className="rounded-2xl border border-white/30 bg-slate-950/60 p-6 text-white shadow-lg backdrop-blur-md">
              {currentPlayer && <div className="relative mt-5 border-t border-white/20 pt-4">
                {currentPlayer.status !== "available" && <AuctionResultTag status={tournament.rtm_enabled !== false && currentPlayer.rtm_team_id ? "rtm" : currentPlayer.status} className="right-0 top-3" />}
                <p className="text-xs font-bold uppercase tracking-wider text-orange-200">{currentPlayer.status === "available" ? "Now on the auction block" : "Auction result"}</p>
                <div className="mt-2 flex items-center gap-3">{currentPlayer.photo_url && <AuctionImage src={currentPlayer.photo_url} alt={currentPlayer.full_name} width={64} height={64} className="h-16 w-16 rounded-lg object-cover" />}<div><p className="text-xl font-black">{currentPlayer.full_name}</p><p className="text-sm text-white/80">#{currentPlayer.player_number}{tournament.show_player_category && displayPlayerCategory(currentPlayer.category) ? ` · Category: ${displayPlayerCategory(currentPlayer.category)}` : ""}</p></div></div>
                {currentPlayer.status !== "unsold" && <div className="mt-4 flex items-end justify-between gap-2"><span className="text-3xl font-black">{formatPoints(currentPlayer.status === "sold" ? currentPlayer.sold_price : tournament.current_bid ?? getAuctionBasePrice(currentPlayer, priceCategories, tournament.base_price))}</span><span className="pb-1 text-sm font-bold text-white/75">points</span></div>}
                <p className="mt-1 text-sm text-white/80">{currentPlayer.status === "sold" ? `Sold to ${teams.find((item) => item.id === currentPlayer.sold_team_id)?.name ?? "team"}` : currentPlayer.status === "unsold" ? "" : currentBidTeam ? currentBidTeam.name : "No bids yet"}</p>
              </div>}
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/20 pt-4 text-center">
                {[["Sold", soldPlayers.length], ["Unsold", players.filter((player) => player.status === "unsold").length], ["Available", activePlayers]].map(([label, value]) => <div key={label}><p className="text-xl font-black">{value}</p><p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{label}</p></div>)}
              </div>
            </div>}
          </div>
          <div className="rounded-2xl border border-white/30 bg-slate-950/35 p-4 shadow-lg backdrop-blur-md sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black uppercase tracking-wide text-white">Teams</h2>
              <span className="text-xs font-bold text-white/80">{teams.length} teams · {players.length} players</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {teams.map((item) => {
                const roster = soldPlayers.filter((player) => player.sold_team_id === item.id);
                const maxBid = getMaxBid(item.points_remaining, roster.length, tournament.min_squad_size, tournament.base_price, item.rtm_count ?? 0);
                return <button type="button" key={item.id} onClick={() => setSelectedTeamSlug(item.slug)} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/30 bg-white/55 p-3 text-left transition hover:bg-white/75 focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <TeamMark name={item.name} logoUrl={item.logo_url} />
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-black uppercase text-slate-800">{item.name}</p><p className="mt-1 text-lg font-black text-orange-700">{roster.length}/{tournament.min_squad_size}</p></div>
                  <div className="text-right"><p className="text-lg font-black text-green-700">{formatPoints(item.points_remaining)}</p><p className="mt-1 text-[11px] font-semibold text-slate-600">Max {formatPoints(maxBid)}</p></div>
                </button>;
              })}
            </div>
          </div>
        </section>}

        {screen === "overview" && team && <>
          <button type="button" onClick={() => setSelectedTeamSlug("")} className="mb-4 rounded-lg border border-white/30 bg-slate-950/60 px-4 py-2 text-sm font-bold text-white hover:bg-slate-950/75">← All teams</button>
          <section className="flex flex-col justify-between gap-5 rounded-2xl border border-white/30 bg-slate-950/25 p-5 text-white shadow-lg sm:flex-row sm:items-center">
            <div className="flex items-center gap-4"><TeamMark name={team.name} logoUrl={team.logo_url} size="lg" /><div><h2 className="text-2xl font-black">{team.name}</h2></div></div>
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-white/20 bg-slate-950/25 p-3 text-center"><p className="text-xs font-bold uppercase text-white/70">Remaining</p><p className="mt-2 text-xl font-black">+{formatPoints(team.points_remaining)}</p></div>
              <div className="rounded-lg border border-white/20 bg-slate-950/25 p-3 text-center"><p className="text-xs font-bold uppercase text-white/70">Max</p><p className="mt-2 text-xl font-black">{formatPoints(getMaxBid(team.points_remaining, players.filter((player) => player.sold_team_id === team.id).length, tournament.min_squad_size, tournament.base_price, team.rtm_count ?? 0))}</p></div>
              <div className="rounded-lg border border-white/20 bg-slate-950/25 p-3 text-center"><p className="text-xs font-bold uppercase text-white/70">Players</p><p className="mt-2 text-xl font-black">{players.filter((player) => player.sold_team_id === team.id).length}/{tournament.min_squad_size}</p></div>
              <div className="rounded-lg border border-white/20 bg-slate-950/25 p-3 text-center"><p className="text-xs font-bold uppercase text-white/70">Spent</p><p className="mt-2 text-xl font-black">-{formatPoints(tournament.points_per_team - team.points_remaining)}</p></div>
            </div>
          </section>
          <div className="mt-7">{tournament.viewer_squad_view === "field" ? <SquadField players={filteredPlayers} playerFields={tournament.projector_player_fields} rtmEnabled={tournament.rtm_enabled !== false} showCategory={tournament.show_player_category} /> : filteredPlayers.length ? <div className="grid gap-3 sm:grid-cols-2">{filteredPlayers.map((player) => <PlayerCard key={player.id} player={player} teams={teams} rtmEnabled={tournament.rtm_enabled !== false} playerFields={tournament.projector_player_fields} showCategory={tournament.show_player_category} />)}</div> : <EmptySquad team={team} />}</div>
        </>}

        {screen === "players" && <section className="grid gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.65fr)]"><AuctionPane currentPlayer={currentPlayer} tournament={tournament} teams={teams} categories={priceCategories} currentBidTeam={currentBidTeam} /><div>
          <section className="grid gap-3 rounded-2xl border border-white/30 bg-slate-950/25 p-5 text-white shadow-lg">
            <div className="flex flex-wrap items-end gap-2">{[["all", "ALL", "border-slate-300 bg-slate-100 text-slate-700"], ["sold", "SOLD", "border-green-300 bg-green-50 text-green-800"], ["unsold", "UNSOLD", "border-red-200 bg-red-50 text-red-700"], ["available", "AVL", "border-slate-300 bg-slate-100 text-slate-700"]].map(([value, label, colors]) => <button key={value} type="button" onClick={() => setFilterStatus(value)} className={`rounded-full border px-4 py-2 text-xs font-black ${filterStatus === value ? "ring-2 ring-orange-400 ring-offset-1" : ""} ${colors}`}>{label}</button>)}</div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setFilterCategory("all")} className={`rounded-full border px-4 py-2 text-xs font-black ${filterCategory === "all" ? "border-orange-400 bg-orange-400 text-slate-950" : "border-slate-300 bg-white text-slate-700"}`}>ALL CATEGORIES</button>{categories.map((category) => <button key={category} type="button" onClick={() => setFilterCategory(category)} className={`rounded-full border px-4 py-2 text-xs font-black ${filterCategory === category ? "border-orange-400 bg-orange-400 text-slate-950" : "border-slate-300 bg-white text-slate-700"}`}>{category}</button>)}</div>
          </section>
          <p className="mt-4 text-sm font-semibold text-slate-600">Showing {filteredPlayers.length} of {players.length} players</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{filteredPlayers.map((player) => <PlayerCard key={player.id} player={player} teams={teams} rtmEnabled={tournament.rtm_enabled !== false} playerFields={tournament.projector_player_fields} showCategory={tournament.show_player_category} />)}</div>
        </div></section>}

        {sponsors.length > 0 && <section className="mt-8 border-t border-slate-200 pt-5"><h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Tournament partners</h2><div className="mt-3 flex flex-wrap gap-3">{sponsors.map((sponsor) => <a key={sponsor.id} href={sponsor.website_url || undefined} target={sponsor.website_url ? "_blank" : undefined} rel={sponsor.website_url ? "noreferrer" : undefined} className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold">{sponsor.sponsor_title && <span className="text-center text-[10px] font-black uppercase tracking-wide text-slate-500">{sponsor.sponsor_title}</span>}<span className="flex items-center gap-2">{sponsor.logo_url && <AuctionImage src={sponsor.logo_url} alt="" width={36} height={36} className="h-9 w-9 object-contain" />}{sponsor.name}</span></a>)}</div></section>}
        <div className="mt-8 rounded-xl bg-blue-950/90 p-2"><DeveloperWatermark /></div>
      </div>
    </main>
  );
}
