"use client";

import Link from "next/link";
import { memo, useEffect, useMemo, useState } from "react";
import AuctionImage from "@/app/components/AuctionImage";
import AuctionResultTag from "@/app/auction/AuctionResultTag";
import TeamMark from "@/app/auction/TeamMark";
import SoldFireworks from "./sold-fireworks";
import { sortSponsors } from "@/lib/auction/sponsors";
import { supabase } from "@/lib/supabase/client";

type Team = { id: string; name: string; slug: string; logo_url: string | null; points_remaining: number; rtm_count: number };
type Player = {
  id: string; player_number: number; full_name: string; category: string; role: string | null;
  batting_style: string | null; bowling_style: string | null; previous_team: string | null; photo_url: string | null;
  status: "available" | "sold" | "unsold"; sold_team_id: string | null; sold_price: number | null; rtm_team_id: string | null;
};
type Sponsor = { id: string; name: string; sponsor_title: string | null; logo_url: string | null; website_url: string | null; display_order: number };
type Tournament = {
  id: string; slug: string; name: string; status: string; scheduled_date: string | null; points_per_team: number; base_price: number;
  bid_increment: number; min_squad_size: number; max_squad_size: number; current_player_id: string | null;
  current_bid: number | null; current_bid_team_id: string | null; background_url: string | null; tournament_logo_url: string | null;
  organizer_logo_urls: string[]; updated_at: string;
};
type AuctionData = { tournament: Tournament; teams: Team[]; players: Player[]; sponsors: Sponsor[] };
type View = "home" | "summary" | "players" | "team";
type PublicScreen = "overview" | "players";
type HomeScreen = PublicScreen | "sponsors";

const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
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

const PlayerCard = memo(function PlayerCard({ player, teams, shouldDisplayCategory }: {
  player: Player;
  teams: Team[];
  shouldDisplayCategory: boolean;
}) {
  const soldTeam = teams.find((item) => item.id === player.sold_team_id);
  const playerRole = player.role || (shouldDisplayCategory ? player.category : null);
  return (
    <article className={`relative min-h-36 overflow-hidden rounded-xl border p-3 shadow-md backdrop-blur-sm ${player.status === "sold" ? "border-green-400/60 bg-gradient-to-r from-green-900/80 to-slate-900/75 text-white" : player.status === "unsold" ? "border-red-300/70 bg-gradient-to-r from-red-900/75 to-slate-900/75 text-white" : "border-white/30 bg-slate-950/55 text-white"}`}>
      <span className={`absolute left-0 top-0 rounded-br-lg px-2 py-1 text-xs font-black ${player.status === "sold" ? "bg-green-500" : player.status === "unsold" ? "bg-red-400 text-red-950" : "bg-slate-300 text-slate-900"}`}>#{player.player_number}</span>
      <div className="flex gap-3 pt-2">
        {player.photo_url ? <AuctionImage src={player.photo_url} alt="" width={80} height={80} className="h-20 w-20 shrink-0 rounded-lg border border-white/40 object-cover" /> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-white/15 text-2xl" aria-hidden="true">🏏</div>}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 truncate text-base font-black text-yellow-300">{player.full_name}</h3>
            {player.status === "sold" && player.rtm_team_id && <span aria-label="Player bought through RTM" className="shrink-0 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-950">RTM</span>}
          </div>
          {playerRole && <p className="mt-1 text-sm font-semibold">{playerRole}</p>}
          <p className="text-xs text-white/85">{player.batting_style || "—"}</p>
          <p className="text-xs text-white/85">{player.bowling_style || "—"}</p>
        </div>
      </div>
      <div className="mt-2 border-t border-white/20 pt-1 text-xs font-black uppercase">{player.status === "sold" ? `${soldTeam?.name ?? "Team"} · ${formatPoints(player.sold_price)} pts` : player.status === "unsold" ? "Unsold" : "Available"}</div>
    </article>
  );
});

const AuctionPane = memo(function AuctionPane({ currentPlayer, tournament, teams, currentBidTeam, shouldDisplayCategory }: {
  currentPlayer: Player | undefined;
  tournament: Tournament;
  teams: Team[];
  currentBidTeam: Team | undefined;
  shouldDisplayCategory: boolean;
}) {
  return <div className="h-[250px] self-start rounded-2xl border border-white/30 bg-slate-950/45 p-5 text-white shadow-lg backdrop-blur-md">
    {currentPlayer && <div className="relative">
      {currentPlayer.status !== "available" && <AuctionResultTag status={currentPlayer.rtm_team_id ? "rtm" : currentPlayer.status} className="right-0 top-0" />}
      <div className="flex items-center gap-3">{currentPlayer.photo_url && <AuctionImage src={currentPlayer.photo_url} alt={currentPlayer.full_name} width={64} height={64} className="h-16 w-16 rounded-lg object-cover" />}<div><p className="text-xl font-black">{currentPlayer.full_name}</p><p className="text-sm text-white/80">#{currentPlayer.player_number}{shouldDisplayCategory ? ` · ${currentPlayer.category}` : ""}</p>{[currentPlayer.role, currentPlayer.batting_style, currentPlayer.bowling_style].filter(Boolean).length > 0 && <p className="text-xs text-white/70">{[currentPlayer.role, currentPlayer.batting_style, currentPlayer.bowling_style].filter(Boolean).join(" · ")}</p>}{currentPlayer.previous_team && <p className="text-xs text-white/70">Team Last Year ({currentPlayer.previous_team})</p>}</div></div>
      {currentPlayer.status !== "unsold" && <div className="mt-4 flex items-baseline gap-2"><span className="text-3xl font-black">{formatPoints(currentPlayer.status === "sold" ? currentPlayer.sold_price : tournament.current_bid ?? tournament.base_price)}</span><span className="text-sm font-bold text-white/75">points</span></div>}
      {currentBidTeam && currentPlayer.status === "available" ? <div className="mt-2 flex items-center gap-2 text-sm font-bold text-white/90"><TeamMark name={currentBidTeam.name} logoUrl={currentBidTeam.logo_url} size="sm" /><span>{currentBidTeam.name}</span></div> : <p className="mt-1 text-sm text-white/80">{currentPlayer.status === "sold" ? `Sold to ${teams.find((item) => item.id === currentPlayer.sold_team_id)?.name ?? "team"}` : currentPlayer.status === "unsold" ? "" : "No bids yet"}</p>}
    </div>}
    {!currentPlayer && tournament.status === "setup" && tournament.scheduled_date && <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-200">Auction scheduled for</p>
      <p className="mt-2 text-2xl font-black">{formatAuctionDate(tournament.scheduled_date)}</p>
    </div>}
  </div>;
});

function AuctionHomeViewer({ tournament, teams, players, sponsors }: {
  tournament: Tournament;
  teams: Team[];
  players: Player[];
  sponsors: Sponsor[];
}) {
  const [screen, setScreen] = useState<HomeScreen>("overview");
  const [selectedTeamSlug, setSelectedTeamSlug] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "balance" | "squad">("name");
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
  })).sort((a, b) => sortBy === "name"
    ? a.team.name.localeCompare(b.team.name)
    : sortBy === "balance"
      ? b.team.points_remaining - a.team.points_remaining
      : b.roster.length - a.roster.length), [teams, soldPlayers, sortBy]);
  const selectedRosterSize = selectedTeam ? soldPlayers.filter((player) => player.sold_team_id === selectedTeam.id).length : 0;
  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return players.filter((player) => {
      const matchesStatus = filterStatus === "all" || player.status === filterStatus;
      const matchesCategory = filterCategory === "all" || player.category === filterCategory;
      const matchesSearch = !query || `${player.full_name} ${player.player_number} ${player.category}`.toLocaleLowerCase().includes(query);
      const matchesTeam = screen !== "overview" || !selectedTeam || player.sold_team_id === selectedTeam.id;
      return matchesStatus && matchesCategory && matchesSearch && matchesTeam;
    });
  }, [players, filterCategory, filterStatus, search, screen, selectedTeam]);
  const shouldDisplayCategory = categories.length > 1;
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
      <div className={`mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col p-2 pb-[76px] sm:pb-[82px] ${screen === "sponsors" ? "gap-2 sm:p-3" : "gap-2 sm:gap-3 sm:p-3 lg:flex-row"}`}>
        {screen !== "sponsors" && <aside className="grid h-fit shrink-0 grid-cols-2 gap-2 lg:w-[35%] lg:min-w-[320px] lg:grid-cols-1 lg:grid-rows-[auto_auto] lg:content-start lg:gap-3 lg:self-start">
          <section className="flex min-w-0 items-center justify-between gap-2 overflow-hidden rounded-xl bg-blue-900/55 px-3 py-2 shadow-lg backdrop-blur-sm sm:px-5">
            {tournament.tournament_logo_url && <AuctionImage src={tournament.tournament_logo_url} alt={`${tournament.name} logo`} width={88} height={88} className="h-8 w-8 shrink-0 object-contain min-[400px]:h-10 min-[400px]:w-10 sm:h-16 sm:w-16" />}
            <h1 className="min-w-0 flex-1 text-center text-[clamp(0.75rem,2.7vw,1rem)] font-black uppercase leading-tight tracking-wide text-white [overflow-wrap:anywhere] sm:text-base lg:text-xl">{tournament.name}</h1>
            {organizerLogo && <AuctionImage src={organizerLogo} alt="Tournament organizer" width={88} height={88} className="h-8 w-8 shrink-0 object-contain min-[400px]:h-10 min-[400px]:w-10 sm:h-16 sm:w-16" />}
          </section>

          <section className="flex min-w-0 flex-col justify-center rounded-xl bg-blue-900/55 p-2 text-center shadow-lg backdrop-blur-sm sm:p-5 lg:justify-start">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/90 sm:text-base">
              {tournament.status === "completed" ? "Auction completed" : tournament.status === "live" ? "Auction is live" : tournament.status === "paused" ? "Auction paused" : "Auction schedule"}
            </p>
            {tournament.status === "setup" && <div className="mt-3 rounded-lg bg-blue-950/40 px-2 py-3 text-yellow-300 sm:mt-5 sm:px-4 sm:py-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/75 sm:text-xs">{tournament.scheduled_date ? "Auction date" : "Current status"}</p>
              <p className="mt-1 text-base font-black sm:text-2xl">{tournament.scheduled_date ? formatAuctionDate(tournament.scheduled_date) : tournament.status.toUpperCase()}</p>
            </div>}
            {currentPlayer && <div className="mt-3 grid min-w-0 grid-cols-[64px_minmax(0,1fr)_32px] items-center gap-2 text-left sm:mt-5 sm:grid-cols-[112px_minmax(0,1fr)_56px] sm:gap-4">
              <div className="relative">
                {currentPlayer.photo_url ? <AuctionImage src={currentPlayer.photo_url} alt="" width={144} height={144} className="h-16 w-16 rounded-lg object-cover sm:h-28 sm:w-28" /> : <div className="grid h-16 w-16 place-items-center rounded-lg bg-white/10 text-sm font-black sm:h-28 sm:w-28 sm:text-3xl">{currentPlayer.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>}
                {currentPlayer.status !== "available" && <AuctionResultTag status={currentPlayer.status === "sold" && currentPlayer.rtm_team_id ? "rtm" : currentPlayer.status} className="!left-1/2 !right-auto !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !border-2 !px-1 !py-1 !text-[10px] !tracking-normal sm:!px-2 sm:!text-lg" />}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 break-words text-sm font-black leading-tight sm:text-lg">{currentPlayer.full_name}</p>
                {currentPlayer.status !== "unsold" && <p className="whitespace-nowrap text-[clamp(1rem,3vw,1.5rem)] font-black leading-tight text-yellow-300">{formatPoints(currentPlayer.status === "sold" ? currentPlayer.sold_price : tournament.current_bid ?? tournament.base_price)} pts</p>}
                {currentPlayer.status === "sold" && playerTeam && <p className="break-words text-[10px] font-bold leading-tight text-white/90 sm:text-xs">Sold to: {playerTeam.name}</p>}
                {currentPlayer.role?.trim() && <p className="break-words text-[10px] leading-tight text-white/75 sm:text-xs">Skill: {currentPlayer.role}</p>}
                {currentPlayer.previous_team?.trim() && <p className="break-words text-[10px] leading-tight text-white/75 sm:text-xs">Previous team: {currentPlayer.previous_team}</p>}
              </div>
              {playerTeam && <div className="justify-self-end sm:justify-self-auto"><span className="sm:hidden"><TeamMark name={playerTeam.name} logoUrl={playerTeam.logo_url} size="sm" /></span><span className="hidden sm:block"><TeamMark name={playerTeam.name} logoUrl={playerTeam.logo_url} size="md" /></span></div>}
            </div>}
          </section>
        </aside>}

        <section className={`flex min-h-0 min-w-0 flex-1 flex-col gap-2 sm:gap-3 ${screen === "sponsors" ? "w-full" : ""}`}>
          {screen !== "sponsors" && <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-900/55 px-3 py-2 shadow-lg backdrop-blur-sm sm:gap-4 sm:px-4">
            <nav className="flex rounded-full bg-slate-950/45 p-1" aria-label="Auction viewer screens">
              {(["overview", "players"] as const).map((tab) => <button key={tab} type="button" onClick={() => { setScreen(tab); setSelectedTeamSlug(""); }} aria-current={screen === tab ? "page" : undefined} className={`rounded-full px-3 py-2 text-[10px] font-black uppercase transition sm:px-5 sm:text-sm ${screen === tab ? "bg-yellow-400 text-slate-950" : "text-white hover:bg-white/10"}`}>{tab === "overview" ? "Teams" : "Players"}</button>)}
            </nav>
            <div className="flex flex-wrap items-center gap-1.5">
              {([["Sold", soldPlayers.length, "bg-green-600"], ["Unsold", unsoldCount, "bg-red-500"], ["Avl", availableCount, "bg-amber-500"]] as const).map(([label, count, color]) => <span key={label} className={`${color} rounded-full px-2.5 py-1 text-[9px] font-black uppercase text-white sm:px-3 sm:text-xs`}>{label} · {count}</span>)}
            </div>
            {screen === "overview" && !selectedTeam && <label className="flex items-center gap-2 rounded-full bg-slate-950/45 px-3 py-2 text-[10px] font-black uppercase text-white sm:text-xs">Sort by<select value={sortBy} onChange={(event) => setSortBy(event.target.value as "name" | "balance" | "squad")} className="max-w-28 bg-transparent font-bold outline-none sm:max-w-none"><option value="name" className="text-slate-900">Team name</option><option value="balance" className="text-slate-900">Balance</option><option value="squad" className="text-slate-900">Squad size</option></select></label>}
          </header>}

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
                    <p className="mt-1 text-[9px] font-bold text-green-400 sm:text-xs">RTM {team.rtm_count ?? 0}</p>
                  </div>
                </button>;
              })}
            </div>}

            {screen === "overview" && selectedTeam && <section>
              <div className="mb-2 flex flex-wrap items-center gap-3 rounded-xl bg-blue-900/50 p-3 shadow-md backdrop-blur-sm">
                <button type="button" onClick={() => setSelectedTeamSlug("")} className="rounded-lg bg-slate-950/40 px-3 py-2 text-xs font-bold text-white">← Teams</button>
                <TeamMark name={selectedTeam.name} logoUrl={selectedTeam.logo_url} size="sm" />
                <h2 className="min-w-0 flex-1 break-words text-sm font-black uppercase sm:text-lg">{selectedTeam.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold sm:text-sm">
                  <span>Reserve: {formatPoints(getReserve(selectedRosterSize, tournament.min_squad_size, tournament.base_price))}</span>
                  <span>Max bid: {formatPoints(getMaxBid(selectedTeam.points_remaining, selectedRosterSize, tournament.min_squad_size, tournament.base_price, selectedTeam.rtm_count ?? 0))}</span>
                  <span className="font-black text-yellow-300">Balance: {formatPoints(selectedTeam.points_remaining)}</span>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">{filteredPlayers.length ? filteredPlayers.map((player) => <PlayerCard key={player.id} player={player} teams={teams} shouldDisplayCategory={shouldDisplayCategory} />) : <p className={`${cardClass} text-slate-600`}>Team yet to pick players.</p>}</div>
            </section>}

            {screen === "players" && <section>
              <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-blue-900/50 p-2.5 shadow-md backdrop-blur-sm sm:p-3">
                {([["all", "All"], ["sold", "Sold"], ["unsold", "Unsold"], ["available", "Avl"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilterStatus(value)} className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase sm:text-xs ${filterStatus === value ? "bg-yellow-400 text-slate-950" : "bg-slate-950/35 text-white"}`}>{label}</button>)}
                <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)} className="max-w-32 rounded-full bg-slate-950/35 px-3 py-1.5 text-[9px] font-bold text-white outline-none sm:text-xs"><option value="all" className="text-slate-900">All categories</option>{categories.map((category) => <option key={category} value={category} className="text-slate-900">{category}</option>)}</select>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search players" className="h-8 min-w-28 flex-1 rounded-full bg-slate-950/35 px-3 text-[10px] text-white outline-none placeholder:text-white/60 sm:text-xs" />
              </div>
              <p className="mb-2 text-xs font-semibold text-slate-800">Showing {filteredPlayers.length} of {players.length} players</p>
              <div className="grid gap-2 sm:grid-cols-2">{filteredPlayers.map((player) => <PlayerCard key={player.id} player={player} teams={teams} shouldDisplayCategory={shouldDisplayCategory} />)}</div>
            </section>}

            {screen !== "sponsors" && sponsors.length > 0 && <section className="mt-3 rounded-xl bg-blue-900/50 p-3 shadow-md backdrop-blur-sm sm:p-4">
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white/85">Sponsors</h2>
              <div className="mt-2 flex flex-wrap gap-2">{sponsors.map((sponsor) => <a key={sponsor.id} href={sponsor.website_url || undefined} target={sponsor.website_url ? "_blank" : undefined} rel={sponsor.website_url ? "noreferrer" : undefined} aria-label={`${sponsor.sponsor_title ? `${sponsor.sponsor_title}: ` : ""}${sponsor.name}`} className="flex min-w-24 flex-col items-center gap-1 rounded-lg bg-slate-200/90 px-3 py-2 text-center text-slate-900">
                {sponsor.sponsor_title && <span className="max-w-full truncate text-[9px] font-black uppercase tracking-wide text-slate-600">{sponsor.sponsor_title}</span>}
                {sponsor.logo_url && <AuctionImage src={sponsor.logo_url} alt={sponsor.name} width={64} height={64} className="h-12 w-12 object-contain" />}
                <span className="max-w-full truncate text-[10px] font-black">{sponsor.name}</span>
              </a>)}</div>
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

      <nav className="absolute inset-x-0 bottom-0 z-20 flex h-[68px] items-center justify-center gap-8 bg-blue-950/95 px-4 shadow-[0_-8px_24px_rgba(15,23,42,0.2)] sm:h-[74px] sm:gap-16" aria-label="Viewer navigation">
        <button type="button" onClick={showHome} className={`flex min-w-16 flex-col items-center gap-1 text-[10px] font-black uppercase ${activeBottomTab === "home" ? "text-yellow-300" : "text-slate-300"}`}><span aria-hidden="true" className="text-xl leading-none">⌂</span>Home</button>
        <button type="button" onClick={showSponsors} className={`flex min-w-16 flex-col items-center gap-1 text-[10px] font-black uppercase ${activeBottomTab === "sponsor" ? "text-yellow-300" : "text-slate-300"}`}><span aria-hidden="true" className="text-xl leading-none">★</span>Sponsor</button>
      </nav>
    </main>
  );
}

export default function AuctionPublic({ slug, view, teamSlug }: { slug: string; view: View; teamSlug?: string }) {
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
    fetch(`/api/auctions/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load this auction.");
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load this auction.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!data?.tournament.id) return;
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
  }, [data?.tournament.id, slug]);

  const team = data?.teams.find((item) => item.slug === selectedTeamSlug);
  const currentPlayer = data?.players.find((player) => player.id === data.tournament.current_player_id);
  const currentBidTeam = data?.teams.find((item) => item.id === data.tournament.current_bid_team_id);
  const filteredSoldPlayers = useMemo(() => (data?.players ?? []).filter((player) => player.status === "sold"), [data?.players]);
  const filteredAvailableCount = useMemo(() => (data?.players ?? []).filter((player) => player.status === "available").length, [data?.players]);
  const categories = useMemo(() => Array.from(new Set((data?.players ?? []).map((player) => player.category.trim()).filter((value) => value && value.toUpperCase() !== "NONE"))).sort(), [data?.players]);
  const shouldDisplayCategory = categories.length > 1;
  const filteredPlayers = useMemo(() => {
    const players = data?.players ?? [];
    const query = search.trim().toLocaleLowerCase();
    return players.filter((player) => {
      const matchesStatus = filterStatus === "all" || player.status === filterStatus;
      const matchesCategory = filterCategory === "all" || player.category === filterCategory;
      const matchesSearch = !query || `${player.full_name} ${player.player_number} ${player.category}`.toLocaleLowerCase().includes(query);
      const matchesTeam = screen !== "overview" || !team || player.sold_team_id === team.id;
      return matchesStatus && matchesCategory && matchesSearch && matchesTeam;
    });
  }, [data?.players, filterCategory, filterStatus, search, screen, team]);

  if (loading) return <main className="min-h-screen bg-slate-50 px-4 py-20 text-center text-slate-600">Loading live auction…</main>;
  if (error || !data) return <main className="min-h-screen bg-slate-50 px-4 py-20 text-center"><p className="font-bold text-red-700">{error || "Auction not found."}</p><Link href="/auction" className="mt-4 inline-block font-bold text-orange-700">Back to auctions</Link></main>;

  const { tournament, teams, players, sponsors } = data;
  const soldPlayers = filteredSoldPlayers;
  const activePlayers = filteredAvailableCount;

  if (view === "home") {
    return <AuctionHomeViewer tournament={tournament} teams={teams} players={players} sponsors={sponsors} />;
  }

  const pageBackground = tournament.background_url
    ? { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.34), rgba(15, 23, 42, 0.42)), url("${tournament.background_url.replace(/["\\]/g, "")}")` }
    : undefined;

  return (
    <main style={pageBackground} className="min-h-screen bg-slate-100 bg-cover bg-fixed bg-center text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-8">
          <Link href="/auction" className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700">MH Sports · Auctions</Link>
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
          {currentPlayer.status !== "available" && <AuctionResultTag status={currentPlayer.rtm_team_id ? "rtm" : currentPlayer.status} />}
          <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">{currentPlayer.photo_url && <AuctionImage src={currentPlayer.photo_url} alt={`${currentPlayer.full_name}`} width={80} height={80} className="h-20 w-20 rounded-xl object-cover" />}<div><h2 className="text-2xl font-black">{currentPlayer.full_name}</h2><p className="mt-1 text-sm text-slate-700">#{currentPlayer.player_number}{shouldDisplayCategory ? ` · ${currentPlayer.category}` : ""}{currentPlayer.role ? ` · ${currentPlayer.role}` : ""}</p></div></div>
            <div className="sm:text-right">{currentPlayer.status !== "unsold" && <p className="text-2xl font-black">{currentPlayer.status === "sold" ? formatPoints(currentPlayer.sold_price) : formatPoints(tournament.current_bid ?? tournament.base_price)} pts</p>}<p className="text-sm text-slate-600">{currentPlayer.status === "sold" ? `Sold to ${teams.find((item) => item.id === currentPlayer.sold_team_id)?.name ?? "team"}` : currentPlayer.status === "unsold" ? "" : currentBidTeam ? currentBidTeam.name : "No bids yet"}</p></div>
          </div>
        </section>}

        {screen === "overview" && !team && <section className="grid gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.65fr)]">
          <div className="grid gap-4">
            <AuctionPane currentPlayer={currentPlayer} tournament={tournament} teams={teams} currentBidTeam={currentBidTeam} shouldDisplayCategory={shouldDisplayCategory} />
            {currentPlayer && !currentPlayer.id && <div className="rounded-2xl border border-white/30 bg-slate-950/60 p-6 text-white shadow-lg backdrop-blur-md">
              {currentPlayer && <div className="relative mt-5 border-t border-white/20 pt-4">
                {currentPlayer.status !== "available" && <AuctionResultTag status={currentPlayer.rtm_team_id ? "rtm" : currentPlayer.status} className="right-0 top-3" />}
                <p className="text-xs font-bold uppercase tracking-wider text-orange-200">{currentPlayer.status === "available" ? "Now on the auction block" : "Auction result"}</p>
                <div className="mt-2 flex items-center gap-3">{currentPlayer.photo_url && <AuctionImage src={currentPlayer.photo_url} alt={currentPlayer.full_name} width={64} height={64} className="h-16 w-16 rounded-lg object-cover" />}<div><p className="text-xl font-black">{currentPlayer.full_name}</p><p className="text-sm text-white/80">#{currentPlayer.player_number}{shouldDisplayCategory ? ` · ${currentPlayer.category}` : ""}</p></div></div>
                {currentPlayer.status !== "unsold" && <div className="mt-4 flex items-end justify-between gap-2"><span className="text-3xl font-black">{formatPoints(currentPlayer.status === "sold" ? currentPlayer.sold_price : tournament.current_bid ?? tournament.base_price)}</span><span className="pb-1 text-sm font-bold text-white/75">points</span></div>}
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
          <div className="mt-7 grid gap-3 sm:grid-cols-2">{filteredPlayers.length ? filteredPlayers.map((player) => <PlayerCard key={player.id} player={player} teams={teams} shouldDisplayCategory={shouldDisplayCategory} />) : <p className={`${cardClass} text-slate-600`}>Team yet to pick players.</p>}</div>
        </>}

        {screen === "players" && <section className="grid gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.65fr)]"><AuctionPane currentPlayer={currentPlayer} tournament={tournament} teams={teams} currentBidTeam={currentBidTeam} shouldDisplayCategory={shouldDisplayCategory} /><div>
          <section className="grid gap-3 rounded-2xl border border-white/30 bg-slate-950/25 p-5 text-white shadow-lg">
            <div className="flex flex-wrap items-end gap-2">{[["all", "ALL", "border-slate-300 bg-slate-100 text-slate-700"], ["sold", "SOLD", "border-green-300 bg-green-50 text-green-800"], ["unsold", "UNSOLD", "border-red-200 bg-red-50 text-red-700"], ["available", "AVL", "border-slate-300 bg-slate-100 text-slate-700"]].map(([value, label, colors]) => <button key={value} type="button" onClick={() => setFilterStatus(value)} className={`rounded-full border px-4 py-2 text-xs font-black ${filterStatus === value ? "ring-2 ring-orange-400 ring-offset-1" : ""} ${colors}`}>{label}</button>)}</div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setFilterCategory("all")} className={`rounded-full border px-4 py-2 text-xs font-black ${filterCategory === "all" ? "border-orange-400 bg-orange-400 text-slate-950" : "border-slate-300 bg-white text-slate-700"}`}>ALL CATEGORIES</button>{categories.map((category) => <button key={category} type="button" onClick={() => setFilterCategory(category)} className={`rounded-full border px-4 py-2 text-xs font-black ${filterCategory === category ? "border-orange-400 bg-orange-400 text-slate-950" : "border-slate-300 bg-white text-slate-700"}`}>{category}</button>)}</div>
          </section>
          <p className="mt-4 text-sm font-semibold text-slate-600">Showing {filteredPlayers.length} of {players.length} players</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{filteredPlayers.map((player) => <PlayerCard key={player.id} player={player} teams={teams} shouldDisplayCategory={shouldDisplayCategory} />)}</div>
        </div></section>}

        {sponsors.length > 0 && <section className="mt-8 border-t border-slate-200 pt-5"><h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Tournament partners</h2><div className="mt-3 flex flex-wrap gap-3">{sponsors.map((sponsor) => <a key={sponsor.id} href={sponsor.website_url || undefined} target={sponsor.website_url ? "_blank" : undefined} rel={sponsor.website_url ? "noreferrer" : undefined} className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold">{sponsor.sponsor_title && <span className="text-center text-[10px] font-black uppercase tracking-wide text-slate-500">{sponsor.sponsor_title}</span>}<span className="flex items-center gap-2">{sponsor.logo_url && <AuctionImage src={sponsor.logo_url} alt="" width={36} height={36} className="h-9 w-9 object-contain" />}{sponsor.name}</span></a>)}</div></section>}
      </div>
    </main>
  );
}
