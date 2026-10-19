"use client";

import Link from "next/link";
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
type Sponsor = { id: string; name: string; logo_url: string | null; website_url: string | null };
type Tournament = {
  id: string; slug: string; name: string; status: string; points_per_team: number; base_price: number;
  bid_increment: number; min_squad_size: number; max_squad_size: number; current_player_id: string | null;
  current_bid: number | null; current_bid_team_id: string | null; background_url: string | null; tournament_logo_url: string | null; updated_at: string;
};
type AuctionData = { tournament: Tournament; teams: Team[]; players: Player[]; sponsors: Sponsor[] };
type View = "home" | "summary" | "players" | "team";
type PublicScreen = "overview" | "players";

const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const inputClass = "mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500";

function formatPoints(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : Number(value).toLocaleString("en-IN");
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
          return { ...previous, sponsors: exists ? previous.sponsors.map((item) => item.id === row.id ? { ...item, ...row } : item) : [...previous.sponsors, row as Sponsor] };
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [data?.tournament.id, slug]);

  const team = data?.teams.find((item) => item.slug === selectedTeamSlug);
  const currentPlayer = data?.players.find((player) => player.id === data.tournament.current_player_id);
  const currentBidTeam = data?.teams.find((item) => item.id === data.tournament.current_bid_team_id);
  const categories = useMemo(() => Array.from(new Set((data?.players ?? []).map((player) => player.category))).sort(), [data]);
  const filteredPlayers = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLocaleLowerCase();
    return data.players.filter((player) => {
      const matchesStatus = filterStatus === "all" || player.status === filterStatus;
      const matchesCategory = filterCategory === "all" || player.category === filterCategory;
      const matchesSearch = !query || `${player.full_name} ${player.player_number} ${player.category}`.toLocaleLowerCase().includes(query);
      const matchesTeam = screen !== "overview" || !team || Boolean(player.sold_team_id === team.id);
      return matchesStatus && matchesCategory && matchesSearch && matchesTeam;
    });
  }, [data, filterCategory, filterStatus, search, screen, team]);

  if (loading) return <main className="min-h-screen bg-slate-50 px-4 py-20 text-center text-slate-600">Loading live auction…</main>;
  if (error || !data) return <main className="min-h-screen bg-slate-50 px-4 py-20 text-center"><p className="font-bold text-red-700">{error || "Auction not found."}</p><Link href="/auction" className="mt-4 inline-block font-bold text-orange-700">Back to auctions</Link></main>;

  const { tournament, teams, players, sponsors } = data;
  const soldPlayers = players.filter((player) => player.status === "sold");
  const activePlayers = players.filter((player) => player.status === "available").length;
  function PlayerCard({ player }: { player: Player }) {
    const soldTeam = teams.find((item) => item.id === player.sold_team_id);
    return (
      <article className={`relative min-h-36 overflow-hidden rounded-xl border p-3 shadow-md backdrop-blur-sm ${player.status === "sold" ? "border-green-400/60 bg-gradient-to-r from-green-900/80 to-slate-900/75 text-white" : player.status === "unsold" ? "border-red-300/70 bg-gradient-to-r from-red-900/75 to-slate-900/75 text-white" : "border-white/30 bg-slate-950/55 text-white"}`}>
        <span className={`absolute left-0 top-0 rounded-br-lg px-2 py-1 text-xs font-black ${player.status === "sold" ? "bg-green-500" : player.status === "unsold" ? "bg-red-400 text-red-950" : "bg-slate-300 text-slate-900"}`}>#{player.player_number}</span>
        <div className="flex gap-3 pt-2">
          {player.photo_url ? <AuctionImage src={player.photo_url} alt="" width={80} height={80} className="h-20 w-20 shrink-0 rounded-lg border border-white/40 object-cover" /> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-white/15 text-2xl" aria-hidden="true">🏏</div>}
          <div className="min-w-0 flex-1"><h3 className="truncate text-base font-black text-yellow-300">{player.full_name}</h3><p className="mt-1 text-sm font-semibold">{player.role || player.category}</p><p className="text-xs text-white/85">{player.batting_style || "—"}</p><p className="text-xs text-white/85">{player.bowling_style || "—"}</p></div>
        </div>
        <div className="mt-2 border-t border-white/20 pt-1 text-xs font-black uppercase">{player.status === "sold" ? `${soldTeam?.name ?? "Team"} · ${formatPoints(player.sold_price)} pts` : player.status === "unsold" ? "Unsold" : "Available"}</div>
      </article>
    );
  }

  const pageBackground = tournament.background_url
    ? { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.34), rgba(15, 23, 42, 0.42)), url("${tournament.background_url.replace(/["\\]/g, "")}")` }
    : undefined;

  function AuctionPane() {
    return <div className="h-[250px] self-start rounded-2xl border border-white/30 bg-slate-950/45 p-5 text-white shadow-lg backdrop-blur-md">
      {currentPlayer && <div className="relative">
        {currentPlayer.status !== "available" && <AuctionResultTag status={currentPlayer.status} className="right-0 top-0" />}
        <div className="flex items-center gap-3">{currentPlayer.photo_url && <AuctionImage src={currentPlayer.photo_url} alt={currentPlayer.full_name} width={64} height={64} className="h-16 w-16 rounded-lg object-cover" />}<div><p className="text-xl font-black">{currentPlayer.full_name}</p><p className="text-sm text-white/80">#{currentPlayer.player_number} · {currentPlayer.category}</p><p className="text-xs text-white/70">{[currentPlayer.role, currentPlayer.batting_style, currentPlayer.bowling_style].filter(Boolean).join(" · ")}</p>{currentPlayer.previous_team && <p className="text-xs text-white/70">Played team last year · {currentPlayer.previous_team}</p>}</div></div>
        {currentPlayer.status !== "unsold" && <div className="mt-4 flex items-baseline gap-2"><span className="text-3xl font-black">{formatPoints(currentPlayer.status === "sold" ? currentPlayer.sold_price : tournament.current_bid ?? tournament.base_price)}</span><span className="text-sm font-bold text-white/75">points</span></div>}
        {currentBidTeam && currentPlayer.status === "available" ? <div className="mt-2 flex items-center gap-2 text-sm font-bold text-white/90"><TeamMark name={currentBidTeam.name} logoUrl={currentBidTeam.logo_url} size="sm" /><span>Highest bid · {currentBidTeam.name}</span></div> : <p className="mt-1 text-sm text-white/80">{currentPlayer.status === "sold" ? `Sold to ${teams.find((item) => item.id === currentPlayer.sold_team_id)?.name ?? "team"}` : currentPlayer.status === "unsold" ? "" : "No bids yet"}</p>}
      </div>}
    </div>;
  }

  return (
    <main style={pageBackground} className={`min-h-screen bg-slate-100 bg-cover bg-fixed bg-center text-slate-950 ${view === "home" ? "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-100 via-slate-100 to-slate-200" : ""}`}>
      <header className={`border-b ${view === "home" ? "border-white/20 bg-slate-950/65 text-white backdrop-blur-md" : "border-slate-200 bg-white"}`}>
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-8">
          <Link href="/auction" className={`text-xs font-bold uppercase tracking-[0.16em] ${view === "home" ? "text-orange-200" : "text-orange-700"}`}>MH Sports · Auctions</Link>
          <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="flex items-center gap-4">{tournament.tournament_logo_url && <AuctionImage src={tournament.tournament_logo_url} alt={`${tournament.name} logo`} width={72} height={72} className="h-14 w-14 shrink-0 rounded-lg object-contain" />}<div><h1 className="text-3xl font-black sm:text-4xl">{tournament.name}</h1>{view !== "home" && <p className="mt-1 text-sm text-slate-600">Live auction board · read-only</p>}</div></div>
            <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-black uppercase ${view === "home" ? "bg-green-400 text-slate-950" : "bg-orange-100 text-orange-800"}`}>{tournament.status}</span>
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
          {currentPlayer.status !== "available" && <AuctionResultTag status={currentPlayer.status} />}
          <p className="text-xs font-black uppercase tracking-[0.15em] text-orange-800">{currentPlayer.status === "available" ? "On the auction block now" : "Auction result"}</p>
          <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">{currentPlayer.photo_url && <AuctionImage src={currentPlayer.photo_url} alt={`${currentPlayer.full_name}`} width={80} height={80} className="h-20 w-20 rounded-xl object-cover" />}<div><h2 className="text-2xl font-black">{currentPlayer.full_name}</h2><p className="mt-1 text-sm text-slate-700">#{currentPlayer.player_number} · {currentPlayer.category}{currentPlayer.role ? ` · ${currentPlayer.role}` : ""}</p></div></div>
            <div className="sm:text-right">{currentPlayer.status !== "unsold" && <p className="text-2xl font-black">{currentPlayer.status === "sold" ? formatPoints(currentPlayer.sold_price) : formatPoints(tournament.current_bid ?? tournament.base_price)} pts</p>}<p className="text-sm text-slate-600">{currentPlayer.status === "sold" ? `Sold to ${teams.find((item) => item.id === currentPlayer.sold_team_id)?.name ?? "team"}` : currentPlayer.status === "unsold" ? "" : currentBidTeam ? `Highest bid · ${currentBidTeam.name}` : "No bids yet"}</p></div>
          </div>
        </section>}

        {screen === "overview" && !team && <section className="grid gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.65fr)]">
          <div className="grid gap-4">
            <AuctionPane />
            {currentPlayer && !currentPlayer.id && <div className="rounded-2xl border border-white/30 bg-slate-950/60 p-6 text-white shadow-lg backdrop-blur-md">
              {currentPlayer && <div className="relative mt-5 border-t border-white/20 pt-4">
                {currentPlayer.status !== "available" && <AuctionResultTag status={currentPlayer.status} className="right-0 top-3" />}
                <p className="text-xs font-bold uppercase tracking-wider text-orange-200">{currentPlayer.status === "available" ? "Now on the auction block" : "Auction result"}</p>
                <div className="mt-2 flex items-center gap-3">{currentPlayer.photo_url && <AuctionImage src={currentPlayer.photo_url} alt={currentPlayer.full_name} width={64} height={64} className="h-16 w-16 rounded-lg object-cover" />}<div><p className="text-xl font-black">{currentPlayer.full_name}</p><p className="text-sm text-white/80">#{currentPlayer.player_number} · {currentPlayer.category}</p></div></div>
                {currentPlayer.status !== "unsold" && <div className="mt-4 flex items-end justify-between gap-2"><span className="text-3xl font-black">{formatPoints(currentPlayer.status === "sold" ? currentPlayer.sold_price : tournament.current_bid ?? tournament.base_price)}</span><span className="pb-1 text-sm font-bold text-white/75">points</span></div>}
                <p className="mt-1 text-sm text-white/80">{currentPlayer.status === "sold" ? `Sold to ${teams.find((item) => item.id === currentPlayer.sold_team_id)?.name ?? "team"}` : currentPlayer.status === "unsold" ? "" : currentBidTeam ? `Highest bid · ${currentBidTeam.name}` : "No bids yet"}</p>
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
                return <button type="button" key={item.id} onClick={() => setSelectedTeamSlug(item.slug)} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/30 bg-white/55 p-3 text-left transition hover:bg-white/75 focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <TeamMark name={item.name} logoUrl={item.logo_url} />
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-black uppercase text-slate-800">{item.name}</p><p className="mt-1 text-lg font-black text-orange-700">{roster.length}/{tournament.min_squad_size}</p></div>
                  <div className="text-right"><p className="text-lg font-black text-orange-700">{formatPoints(item.points_remaining)}</p><p className="text-[10px] font-bold uppercase text-green-700">Remaining</p><p className="mt-1 text-[11px] font-semibold text-slate-600">Spent {formatPoints(tournament.points_per_team - item.points_remaining)}</p></div>
                </button>;
              })}
            </div>
          </div>
        </section>}

        {screen === "overview" && team && <>
          <button type="button" onClick={() => setSelectedTeamSlug("")} className="mb-4 rounded-lg border border-white/30 bg-slate-950/60 px-4 py-2 text-sm font-bold text-white hover:bg-slate-950/75">← All teams</button>
          <section className="flex flex-col justify-between gap-5 rounded-2xl border border-white/30 bg-slate-950/25 p-5 text-white shadow-lg sm:flex-row sm:items-center">
            <div className="flex items-center gap-4"><TeamMark name={team.name} logoUrl={team.logo_url} size="lg" /><div><h2 className="text-2xl font-black">{team.name}</h2></div></div>
            <div className="grid grid-cols-3 gap-3"><div className="rounded-lg border border-white/20 bg-slate-950/25 p-3"><p className="text-xs font-bold uppercase text-white/70">Remaining</p><p className="text-xl font-black">{formatPoints(team.points_remaining)}</p></div><div className="rounded-lg border border-white/20 bg-slate-950/25 p-3"><p className="text-xs font-bold uppercase text-white/70">Spent</p><p className="text-xl font-black">{formatPoints(tournament.points_per_team - team.points_remaining)}</p></div><div className="rounded-lg border border-white/20 bg-slate-950/25 p-3"><p className="text-xs font-bold uppercase text-white/70">Players</p><p className="text-xl font-black">{players.filter((player) => player.sold_team_id === team.id).length}/{tournament.min_squad_size}</p></div></div>
          </section>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">{filteredPlayers.length ? filteredPlayers.map((player) => <PlayerCard key={player.id} player={player} />) : <p className={`${cardClass} text-slate-600`}>Team yet to pick players.</p>}</div>
        </>}

        {screen === "players" && <section className="grid gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.65fr)]"><AuctionPane /><div>
          <section className="grid gap-3 rounded-2xl border border-white/30 bg-slate-950/25 p-5 text-white shadow-lg">
            <div className="flex flex-wrap items-end gap-2">{[["all", "ALL", "border-slate-300 bg-slate-100 text-slate-700"], ["sold", "SOLD", "border-green-300 bg-green-50 text-green-800"], ["unsold", "UNSOLD", "border-red-200 bg-red-50 text-red-700"], ["available", "AVL", "border-slate-300 bg-slate-100 text-slate-700"]].map(([value, label, colors]) => <button key={value} type="button" onClick={() => setFilterStatus(value)} className={`rounded-full border px-4 py-2 text-xs font-black ${filterStatus === value ? "ring-2 ring-orange-400 ring-offset-1" : ""} ${colors}`}>{label}</button>)}</div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setFilterCategory("all")} className={`rounded-full border px-4 py-2 text-xs font-black ${filterCategory === "all" ? "border-orange-400 bg-orange-400 text-slate-950" : "border-slate-300 bg-white text-slate-700"}`}>ALL CATEGORIES</button>{categories.map((category) => <button key={category} type="button" onClick={() => setFilterCategory(category)} className={`rounded-full border px-4 py-2 text-xs font-black ${filterCategory === category ? "border-orange-400 bg-orange-400 text-slate-950" : "border-slate-300 bg-white text-slate-700"}`}>{category}</button>)}</div>
          </section>
          <p className="mt-4 text-sm font-semibold text-slate-600">Showing {filteredPlayers.length} of {players.length} players</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{filteredPlayers.map((player) => <PlayerCard key={player.id} player={player} />)}</div>
        </div></section>}

        {sponsors.length > 0 && <section className="mt-8 border-t border-slate-200 pt-5"><h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Tournament partners</h2><div className="mt-3 flex flex-wrap gap-3">{sponsors.map((sponsor) => <a key={sponsor.id} href={sponsor.website_url || undefined} target={sponsor.website_url ? "_blank" : undefined} rel={sponsor.website_url ? "noreferrer" : undefined} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold">{sponsor.logo_url && <AuctionImage src={sponsor.logo_url} alt="" width={36} height={36} className="h-9 w-9 object-contain" />}{sponsor.name}</a>)}</div></section>}
      </div>
    </main>
  );
}
