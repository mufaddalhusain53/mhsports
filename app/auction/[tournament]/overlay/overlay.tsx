"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AuctionImage from "@/app/components/AuctionImage";
import TeamMark from "@/app/auction/TeamMark";
import { getAuctionBasePrice, upsertAuctionCategory, type AuctionPriceCategory } from "@/lib/auction/pricing";
import { supabase } from "@/lib/supabase/client";

type Team = { id: string; name: string; logo_url: string | null; points_remaining: number; player_count: number };
type Player = {
  id: string;
  player_number: number;
  full_name: string;
  category: string;
  category_id: string | null;
  role: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  photo_url: string | null;
  status: "available" | "sold" | "unsold";
  sold_team_id: string | null;
  sold_price: number | null;
  rtm_team_id: string | null;
};
type Tournament = {
  id: string;
  slug: string;
  name: string;
  status: string;
  base_price: number;
  current_player_id: string | null;
  current_bid: number | null;
  current_bid_team_id: string | null;
  tournament_logo_url: string | null;
};
type OverlayData = { tournament: Tournament; teams: Team[]; player: Player | null; categories: AuctionPriceCategory[] };

function points(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : Number(value).toLocaleString("en-IN");
}

export default function AuctionOverlay({ slug }: { slug: string }) {
  const [data, setData] = useState<OverlayData | null>(null);
  const [error, setError] = useState("");
  const [teamSlideIndex, setTeamSlideIndex] = useState(0);
  const playerIdRef = useRef<string | null>(null);
  const leadingTeamId = data
    ? data.tournament.current_bid_team_id ?? (data.player?.status === "sold" ? data.player.sold_team_id : null)
    : null;
  const hasLeadingTeam = Boolean(leadingTeamId && data?.teams.some((team) => team.id === leadingTeamId));
  const teamPageSize = hasLeadingTeam ? 3 : 4;
  const teamSlideCount = data && data.teams.length > 4
    ? Math.ceil((data.teams.length - (hasLeadingTeam ? 1 : 0)) / teamPageSize)
    : 1;
  const activeTeamSlideIndex = teamSlideIndex % teamSlideCount;

  useEffect(() => {
    if (teamSlideCount <= 1) return;
    const intervalId = window.setInterval(() => {
      setTeamSlideIndex((current) => ((current % teamSlideCount) + 1) % teamSlideCount);
    }, 6000);
    return () => window.clearInterval(intervalId);
  }, [teamSlideCount]);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/auctions/${encodeURIComponent(slug)}/overlay`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load auction overlay.");
    playerIdRef.current = result.tournament.current_player_id;
    setData(result);
    setError("");
  }, [slug]);

  useEffect(() => {
    let active = true;
    fetch(`/api/auctions/${encodeURIComponent(slug)}/overlay`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load auction overlay.");
        if (active) {
          playerIdRef.current = result.tournament.current_player_id;
          setData(result);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load auction overlay.");
      });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!data?.tournament.id) return;
    const tournamentId = data.tournament.id;
    const channel = supabase.channel(`youtube-auction-overlay-${tournamentId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "auction_tournaments", filter: `slug=eq.${slug}` }, ({ new: row }) => {
        const nextPlayerId = (row as Partial<Tournament>).current_player_id ?? null;
        if (nextPlayerId !== playerIdRef.current) {
          void refresh().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to refresh auction overlay."));
          return;
        }
        setData((previous) => previous
          ? { ...previous, tournament: { ...previous.tournament, ...(row as Partial<Tournament>) } }
          : previous);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_players", filter: `tournament_id=eq.${tournamentId}` }, (change) => {
        if (change.eventType === "DELETE") return;
        const row = change.new as Partial<Player>;
        setData((previous) => {
          if (!previous) return previous;
          const current = previous.player;
          const teams = previous.teams.map((team) => {
            let playerCount = team.player_count;
            if (current && current.id === row.id) {
              if (current.status === "sold" && current.sold_team_id === team.id) playerCount -= 1;
              if (row.status === "sold" && row.sold_team_id === team.id) playerCount += 1;
            }
            return playerCount === team.player_count ? team : { ...team, player_count: playerCount };
          });
          return {
            ...previous,
            teams,
            player: row.id === playerIdRef.current && current ? { ...current, ...row } : current,
          };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_teams", filter: `tournament_id=eq.${tournamentId}` }, (change) => {
        const row = change.new as Partial<Team>;
        setData((previous) => {
          if (!previous) return previous;
          if (change.eventType === "DELETE") return { ...previous, teams: previous.teams.filter((team) => team.id !== change.old.id) };
          if (!row.id) return previous;
          const exists = previous.teams.some((team) => team.id === row.id);
          return {
            ...previous,
            teams: exists
              ? previous.teams.map((team) => team.id === row.id ? { ...team, ...row } : team)
              : [...previous.teams, row as Team],
          };
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
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setError("Live updates disconnected.");
        else if (status === "SUBSCRIBED") setError("");
      });
    return () => { void supabase.removeChannel(channel); };
  }, [data?.tournament.id, refresh, slug]);

  if (!data) return <main className="youtube-auction-overlay">
    {error && <p role="alert" className="rounded-lg bg-red-950/90 px-4 py-2 text-sm font-bold text-white">{error}</p>}
  </main>;

  const { tournament, teams, player, categories } = data;
  const teamId = leadingTeamId;
  const sortedTeams = [...teams].sort((left, right) => {
    if (left.id === teamId) return -1;
    if (right.id === teamId) return 1;
    return right.points_remaining - left.points_remaining;
  });
  const pinnedTeam = hasLeadingTeam ? sortedTeams.find((team) => team.id === teamId) : undefined;
  const rotatingTeams = pinnedTeam ? sortedTeams.filter((team) => team.id !== pinnedTeam.id) : sortedTeams;
  const visibleTeams = teams.length > 4
    ? [
      ...(pinnedTeam ? [pinnedTeam] : []),
      ...rotatingTeams.slice(activeTeamSlideIndex * teamPageSize, (activeTeamSlideIndex + 1) * teamPageSize),
    ]
    : sortedTeams;
  const result = player?.status === "sold" ? (player.rtm_team_id ? "RTM" : "SOLD") : player?.status === "unsold" ? "UNSOLD" : null;
  const bid = player?.status === "sold" ? player.sold_price : tournament.current_bid ?? (player ? getAuctionBasePrice(player, categories, tournament.base_price) : null);
  const statusLabel = tournament.status === "live" ? "LIVE AUCTION" : tournament.status === "completed" ? "AUCTION COMPLETE" : "AUCTION";
  const priceLabel = result ? (result === "UNSOLD" ? "UNSOLD AT" : "SOLD FOR") : tournament.current_bid === null ? "BASE PRICE" : "CURRENT BID";

  return (
    <main className="youtube-auction-overlay" aria-label="Live auction stream overlay">
      <section className="youtube-auction-lower-third">
        <div className="youtube-overlay-player-panel">
          <div className="youtube-overlay-player-photo-wrap">
            {player?.photo_url
              ? <AuctionImage src={player.photo_url} alt={player.full_name} width={240} height={280} className="youtube-overlay-player-photo" />
              : <div className="youtube-overlay-player-photo youtube-overlay-photo-placeholder">{player ? `#${player.player_number}` : "🏏"}</div>}
          </div>
          <div className="youtube-overlay-player-content">
            <div className="youtube-overlay-event">
              {tournament.tournament_logo_url && <AuctionImage src={tournament.tournament_logo_url} alt="" width={36} height={36} className="youtube-overlay-event-logo" />}
              <span>{tournament.name}</span>
              <b>{statusLabel}</b>
            </div>
            <div className="youtube-overlay-player-copy">
              {!player && <p className="youtube-overlay-eyebrow">UP NEXT</p>}
              <h1>
                {player && <span className="youtube-overlay-number">#{player.player_number}</span>}
                <span>{player?.full_name ?? "Waiting for next player"}</span>
              </h1>
              <p className="youtube-overlay-player-meta">{[player?.role, player?.batting_style, player?.bowling_style].filter(Boolean).join("  ·  ") || "Auction player"}</p>
              {player?.category && <p className="youtube-overlay-player-category">Category · {player.category}</p>}
            </div>
            <div className={`youtube-overlay-bid-card ${result ? "youtube-overlay-bid-result" : ""}`}>
              <span className="youtube-overlay-bid-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 3v18m5-13.5c0-1.7-2.2-3-5-3s-5 1.3-5 3 2.2 3 5 3 5 1.3 5 3-2.2 3-5 3-5-1.3-5-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </span>
              <span className="youtube-overlay-bid-label">{priceLabel}</span>
              <strong>{points(bid)} <small>PTS</small></strong>
              {teamId && !result && <span className="youtube-overlay-highest">LEADING BID</span>}
              {result && <span className="youtube-overlay-highest">{result}</span>}
            </div>
          </div>
        </div>

        <div className="youtube-overlay-team-panel">
          <div
            key={activeTeamSlideIndex}
            className={`youtube-overlay-team-rows${teams.length > 4 ? " youtube-overlay-team-rows-carousel" : ""}`}
            aria-label={teams.length > 4 ? `Team group ${activeTeamSlideIndex + 1} of ${teamSlideCount}` : undefined}
          >
            {visibleTeams.map((item) => <div key={item.id} className={`youtube-overlay-team-row ${item.id === teamId ? "youtube-overlay-leading-team" : ""}`}>
              <div className="youtube-overlay-team-identity">
                <TeamMark name={item.name} logoUrl={item.logo_url} size="sm" />
                <div><strong>{item.name}</strong><span>{item.player_count} PLAYERS</span></div>
              </div>
              <div className="youtube-overlay-purse">
                <span>PURSE LEFT</span>
                <strong>{points(item.points_remaining)} <small>PTS</small></strong>
              </div>
            </div>)}
          </div>
        </div>
      </section>
      {error && <p role="alert" className="absolute right-4 top-4 rounded-lg bg-red-950/90 px-3 py-2 text-xs font-bold text-white">{error}</p>}
    </main>
  );
}
