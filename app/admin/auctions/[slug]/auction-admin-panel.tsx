"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import AuctionImage from "@/app/components/AuctionImage";
import AuctionResultTag from "@/app/auction/AuctionResultTag";
import TeamMark from "@/app/auction/TeamMark";

type Team = { id: string; name: string; slug: string; logo_url: string | null; points_remaining: number };
type Player = {
  id: string; player_number: number; full_name: string; category: string; role: string | null;
  batting_style: string | null; bowling_style: string | null; previous_team: string | null; photo_url: string | null;
  status: "available" | "sold" | "unsold"; sold_team_id: string | null; sold_price: number | null;
};
type Sponsor = { id: string; name: string; logo_url: string | null; website_url: string | null };
type IncrementRule = { from: number; increment: number };
type Tournament = {
  id: string; slug: string; name: string; status: string; points_per_team: number; base_price: number;
  bid_increment: number; bid_increment_rules: IncrementRule[]; min_squad_size: number; max_squad_size: number; current_player_id: string | null;
  current_bid: number | null; current_bid_team_id: string | null; background_url: string | null;
  tournament_logo_url: string | null; organizer_logo_urls: string[];
};
type AuctionData = { tournament: Tournament; teams: Team[]; players: Player[]; sponsors: Sponsor[] };
type PlayerFormData = Omit<Player, "status" | "sold_team_id" | "sold_price">;
type TeamFormData = Pick<Team, "id" | "name" | "logo_url">;
type SponsorFormData = Sponsor;

const inputClass = "mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-orange-500";
const buttonClass = "rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50";

function incrementRulesFor(tournament: Tournament): IncrementRule[] {
  const rules = Array.isArray(tournament.bid_increment_rules) ? tournament.bid_increment_rules : [];
  return rules.length ? rules : [{ from: 0, increment: tournament.bid_increment }];
}

function incrementForBid(tournament: Tournament, bid: number) {
  return incrementRulesFor(tournament).filter((rule) => rule.from <= bid).at(-1)?.increment ?? tournament.bid_increment;
}

function normalizedHeader(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function field(row: Record<string, unknown>, aliases: string[]) {
  const keys = Object.keys(row);
  const key = keys.find((candidate) => aliases.includes(normalizedHeader(candidate)));
  return key ? String(row[key] ?? "").trim() : "";
}

function publicPlayerRow(row: Record<string, unknown>, index: number) {
  const playerNumber = field(row, ["playernumber", "playerno", "number", "jerseynumber", "sno", "serialnumber"]) || String(index + 1);
  const firstName = field(row, ["firstname", "givenname"]);
  const lastName = field(row, ["lastname", "surname", "familyname"]);
  const role = field(row, ["role", "playerrole"]);
  return {
    player_number: Number(playerNumber),
    full_name: field(row, ["fullname", "playername", "name", "player"]) || `${firstName} ${lastName}`.trim(),
    category: field(row, ["category", "group", "auctioncategory", "type"]) || role,
    role,
    batting_style: field(row, ["battingstyle", "battinghand"]),
    bowling_style: field(row, ["bowlingstyle", "bowlingtype"]),
    previous_team: field(row, ["previousteam", "season1team", "currentteam", "team"]),
    photo_url: field(row, ["photourl", "photo", "imageurl", "playerphoto"]),
  };
}

export default function AuctionAdminPanel({ slug, view = "setup" }: { slug: string; view?: "setup" | "run" }) {
  const [data, setData] = useState<AuctionData | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamLogo, setTeamLogo] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [tournamentLogoUrl, setTournamentLogoUrl] = useState("");
  const [organizerLogoUrls, setOrganizerLogoUrls] = useState("");
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorLogo, setSponsorLogo] = useState("");
  const [sponsorWebsite, setSponsorWebsite] = useState("");
  const [incrementRules, setIncrementRules] = useState<IncrementRule[]>([]);
  const [selectionMode, setSelectionMode] = useState("random");
  const [selectionCategory, setSelectionCategory] = useState("");
  const [selectedPlayerNumber, setSelectedPlayerNumber] = useState("");
  const [bidDraft, setBidDraft] = useState<{ key: string; value: string } | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<PlayerFormData | null>(null);
  const [editingTeam, setEditingTeam] = useState<TeamFormData | null>(null);
  const [editingSponsor, setEditingSponsor] = useState<SponsorFormData | null>(null);
  const [pendingReauctionPlayer, setPendingReauctionPlayer] = useState<Player | null>(null);
  const [pendingDeleteTeam, setPendingDeleteTeam] = useState<Team | null>(null);
  const [pendingDeleteSponsor, setPendingDeleteSponsor] = useState<Sponsor | null>(null);
  const [pendingBids, setPendingBids] = useState(0);
  const bidQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingBidCount = useRef(0);
  const failedBidQueue = useRef(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/auctions/${encodeURIComponent(slug)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load auction.");
    setData(result);
    setBackgroundUrl(result.tournament.background_url ?? "");
    setTournamentLogoUrl(result.tournament.tournament_logo_url ?? "");
    setOrganizerLogoUrls((result.tournament.organizer_logo_urls ?? []).join("\n"));
    setIncrementRules(incrementRulesFor(result.tournament));
  }, [slug]);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/auctions/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load auction.");
        if (active) {
          setData(result);
          setBackgroundUrl(result.tournament.background_url ?? "");
          setTournamentLogoUrl(result.tournament.tournament_logo_url ?? "");
          setOrganizerLogoUrls((result.tournament.organizer_logo_urls ?? []).join("\n"));
          setIncrementRules(incrementRulesFor(result.tournament));
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load auction.");
      });
    return () => { active = false; };
  }, [slug]);

  const availablePlayers = useMemo(() => (data?.players ?? []).filter((player) => player.status === "available"), [data]);
  const categories = useMemo(() => {
    const pool = selectionMode === "unsold"
      ? (data?.players ?? []).filter((player) => player.status === "unsold")
      : availablePlayers;
    return Array.from(new Set(pool.map((player) => player.category))).sort();
  }, [availablePlayers, data, selectionMode]);
  const currentPlayer = data?.players.find((player) => player.id === data.tournament.current_player_id);
  const currentTeam = data?.teams.find((team) => team.id === data.tournament.current_bid_team_id);
  const soldPlayers = data?.players.filter((player) => player.status === "sold").length ?? 0;
  const unsoldPlayers = data?.players.filter((player) => player.status === "unsold").length ?? 0;
  const nextBid = data?.tournament.current_bid == null
    ? data?.tournament.base_price ?? 0
    : Math.round((data.tournament.current_bid + incrementForBid(data.tournament, data.tournament.current_bid)) * 100) / 100;
  function reserveForTeam(team: Team) {
    const bought = (data?.players ?? []).filter((player) => player.status === "sold" && player.sold_team_id === team.id).length;
    return Math.max((data?.tournament.min_squad_size ?? 0) - bought - 1, 0) * (data?.tournament.base_price ?? 0);
  }
  function maximumBidForTeam(team: Team) { return Math.max(0, team.points_remaining - reserveForTeam(team)); }

  const numberSelectedPlayer = data?.players.find((player) => player.player_number === Number(selectedPlayerNumber));
  const bidDraftKey = `${currentPlayer?.id ?? ""}:${data?.tournament.current_bid ?? "opening"}`;
  const bidAmount = bidDraft?.key === bidDraftKey ? bidDraft.value : String(nextBid ?? "");
  const minimumSelectableBid = data?.tournament.current_bid == null ? (nextBid ?? 0) : data.tournament.base_price;
  function adjustBid(direction: "up" | "down") {
    if (!data) return;
    const current = Number(bidAmount);
    const value = Number.isFinite(current) ? current : (data.tournament.current_bid ?? data.tournament.base_price);
    const increment = direction === "up"
      ? incrementForBid(data.tournament, value)
      : incrementForBid(data.tournament, Math.max(data.tournament.base_price, value - 0.01));
    const adjusted = direction === "up" ? value + increment : Math.max(minimumSelectableBid, value - increment);
    setBidDraft({ key: bidDraftKey, value: String(Math.round(adjusted * 100) / 100) });
  }

  function optimisticUpdate(previous: AuctionData, body: Record<string, unknown>): AuctionData {
    const tournament = previous.tournament;
    if (body.action === "select_player" && typeof body.playerId === "string") {
      const target = previous.players.find((player) => player.id === body.playerId);
      if (!target) return previous;
      const teams = previous.teams.map((team) => team.id === target.sold_team_id
        ? { ...team, points_remaining: team.points_remaining + (target.sold_price ?? 0) }
        : team);
      return {
        ...previous,
        teams,
        players: previous.players.map((player) => player.id === target.id
          ? { ...player, status: "available", sold_team_id: null, sold_price: null }
          : player),
        tournament: { ...tournament, current_player_id: target.id, current_bid: null, current_bid_team_id: null },
      };
    }
    if ((body.action === "bid" || body.action === "correct_bid") && typeof body.teamId === "string" && typeof body.amount === "number") {
      return { ...previous, tournament: { ...tournament, current_bid: body.amount, current_bid_team_id: body.teamId } };
    }
    if (body.action === "finalize" && (body.result === "sold" || body.result === "unsold")) {
      const player = previous.players.find((item) => item.id === tournament.current_player_id);
      if (!player) return previous;
      const sold = body.result === "sold";
      const teams = sold && tournament.current_bid_team_id
        ? previous.teams.map((team) => team.id === tournament.current_bid_team_id
          ? { ...team, points_remaining: team.points_remaining - (tournament.current_bid ?? 0) }
          : team)
        : previous.teams;
      return {
        ...previous,
        teams,
        players: previous.players.map((item) => item.id === player.id
          ? { ...item, status: sold ? "sold" : "unsold", sold_team_id: sold ? tournament.current_bid_team_id : null, sold_price: sold ? tournament.current_bid : null }
          : item),
        tournament: { ...tournament, current_bid: null, current_bid_team_id: null },
      };
    }
    if (body.action === "skip_player") {
      return { ...previous, tournament: { ...tournament, current_player_id: null, current_bid: null, current_bid_team_id: null } };
    }
    if (body.action === "start" || body.action === "resume" || body.action === "pause" || body.action === "complete") {
      const status = body.action === "start" || body.action === "resume" ? "live" : body.action === "pause" ? "paused" : "completed";
      return { ...previous, tournament: { ...tournament, status } };
    }
    return previous;
  }

  async function action(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError("");
    setMessage("");
    const before = data;
    const optimistic = before ? optimisticUpdate(before, body) : null;
    const hasOptimisticUpdate = Boolean(before && optimistic !== before);
    if (optimistic && hasOptimisticUpdate) setData(optimistic);
    try {
      const response = await fetch(`/api/admin/auctions/${encodeURIComponent(slug)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Auction update failed.");
      if (!hasOptimisticUpdate) await load();
      setMessage("Auction updated.");
      return true;
    } catch (reason) {
      if (hasOptimisticUpdate && before) setData(before);
      setError(reason instanceof Error ? reason.message : "Auction update failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitRules(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const form = new FormData(event.currentTarget);
    await action({
      action: "rules", pointsPerTeam: Number(form.get("pointsPerTeam")), basePrice: Number(form.get("basePrice")),
      bidIncrement: incrementRules[0]?.increment ?? data.tournament.bid_increment, bidIncrementRules: incrementRules, minSquadSize: Number(form.get("minSquadSize")),
      maxSquadSize: Number(form.get("maxSquadSize")),
    });
  }

  async function uploadAsset(file: File, type: "team" | "sponsor" | "background" | "tournament" | "organizer") {
    const form = new FormData();
    form.set("file", file);
    form.set("assetType", type);
    const response = await fetch(`/api/admin/auctions/${encodeURIComponent(slug)}/assets`, { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Image upload failed.");
    return String(result.url);
  }

  async function addTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/auctions/${encodeURIComponent(slug)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_team", name: teamName, logoUrl: teamLogo }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to add team.");
      setTeamName(""); setTeamLogo(""); await load(); setMessage("Team added.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to add team."); }
    finally { setBusy(false); }
  }

  async function saveTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTeam) return;
    const saved = await action({
      action: "edit_team",
      teamId: editingTeam.id,
      name: editingTeam.name,
      logoUrl: editingTeam.logo_url,
    });
    if (saved) {
      setEditingTeam(null);
      setMessage("Team updated.");
    }
  }

  async function deleteTeam(team: Team) {
    setPendingDeleteTeam(team);
  }

  async function confirmDeleteTeam() {
    if (!pendingDeleteTeam) return;
    const succeeded = await action({ action: "delete_team", teamId: pendingDeleteTeam.id });
    if (succeeded) setPendingDeleteTeam(null);
  }

  async function uploadEditedTeamLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editingTeam) return;
    setBusy(true);
    setError("");
    try {
      const logoUrl = await uploadAsset(file, "team");
      setEditingTeam((team) => team ? { ...team, logo_url: logoUrl } : team);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Team logo upload failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function addSponsor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/auctions/${encodeURIComponent(slug)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_sponsor", name: sponsorName, logoUrl: sponsorLogo, websiteUrl: sponsorWebsite }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to add sponsor.");
      setSponsorName(""); setSponsorLogo(""); setSponsorWebsite(""); await load(); setMessage("Sponsor added.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to add sponsor."); }
    finally { setBusy(false); }
  }

  async function saveSponsor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSponsor) return;
    const saved = await action({ action: "edit_sponsor", sponsorId: editingSponsor.id, name: editingSponsor.name, logoUrl: editingSponsor.logo_url, websiteUrl: editingSponsor.website_url });
    if (saved) {
      setEditingSponsor(null);
      setMessage("Sponsor updated.");
    }
  }

  async function confirmDeleteSponsor() {
    if (!pendingDeleteSponsor) return;
    const succeeded = await action({ action: "delete_sponsor", sponsorId: pendingDeleteSponsor.id });
    if (succeeded) setPendingDeleteSponsor(null);
  }

  async function uploadEditedSponsorLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editingSponsor) return;
    setBusy(true);
    setError("");
    try {
      const logoUrl = await uploadAsset(file, "sponsor");
      setEditingSponsor((sponsor) => sponsor ? { ...sponsor, logo_url: logoUrl } : sponsor);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sponsor logo upload failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function importPlayers(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error("The workbook does not contain a worksheet.");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      if (!rows.length) throw new Error("No player rows found in the first worksheet.");
      const players = rows.map(publicPlayerRow);
      if (players.some((player) => !player.full_name || !player.category || !Number.isInteger(player.player_number) || player.player_number < 1)) {
        throw new Error("Each row needs a Name and Category; Player Number is optional and defaults to its row number.");
      }
      const response = await fetch(`/api/admin/auctions/${encodeURIComponent(slug)}/players`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ players }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Player import failed.");
      await load();
      setMessage(`Imported ${result.imported} players.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Player import failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  function downloadPlayerTemplate() {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Player Number", "Name", "Category", "Role", "Batting Style", "Bowling Style", "Previous Team", "Photo URL"],
    ]);
    worksheet["!cols"] = [{ wch: 16 }, { wch: 28 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Players");
    XLSX.writeFile(workbook, `${slug}-auction-player-template.xlsx`);
  }

  async function savePlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPlayer) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/auctions/${encodeURIComponent(slug)}/players`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlayer),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update player.");
      setEditingPlayer(null);
      await load();
      setMessage("Player details updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update player.");
    } finally {
      setBusy(false);
    }
  }

  function updateEditingPlayer<K extends keyof PlayerFormData>(key: K, value: PlayerFormData[K]) {
    setEditingPlayer((player) => player ? { ...player, [key]: value } : player);
  }

  async function selectPlayer() {
    if (!data) return;
    let playerId = numberSelectedPlayer?.id ?? "";
    if (selectionMode === "random" || selectionMode === "category" || selectionMode === "unsold") {
      const pool = selectionMode === "unsold"
        ? data.players.filter((player) => player.status === "unsold")
        : availablePlayers.filter((player) => player.id !== currentPlayer?.id);
      const candidates = selectionCategory ? pool.filter((player) => player.category === selectionCategory) : pool;
      if (!candidates.length) { setError("No other players are available for that selection."); return; }
      playerId = candidates[Math.floor(Math.random() * candidates.length)].id;
    }
    if (!playerId || (selectionMode === "number" && !numberSelectedPlayer)) {
      setError("Enter a player number that exists in this tournament.");
      return;
    }
    if (playerId === currentPlayer?.id) {
      setError("That player is already on the auction block.");
      return;
    }
    await action({ action: "select_player", playerId });
  }

  async function selectPlayerFromTable(player: Player) {
    if (player.id === currentPlayer?.id) return;
    if (player.status === "sold") {
      setPendingReauctionPlayer(player);
      return;
    }
    await action({ action: "select_player", playerId: player.id });
  }

  async function confirmReauction() {
    if (!pendingReauctionPlayer) return;
    const selected = pendingReauctionPlayer;
    const succeeded = await action({ action: "select_player", playerId: selected.id });
    if (succeeded) setPendingReauctionPlayer(null);
  }

  async function skipCurrentPlayer() {
    await action({ action: "skip_player" });
  }

  async function placeTeamBid(team: Team) {
    const amount = Number(bidAmount);
    if (!Number.isFinite(amount) || amount < minimumSelectableBid) {
      setError(`Enter a bid of at least ${minimumSelectableBid}.`);
      return;
    }
    if (amount > maximumBidForTeam(team)) {
      setError(`${team.name} can bid up to ${maximumBidForTeam(team)}; ${reserveForTeam(team)} points are reserved for the remaining minimum squad slots.`);
      return;
    }
    const body = { action: data?.tournament.current_bid != null && amount <= data.tournament.current_bid ? "correct_bid" : "bid", teamId: team.id, amount };
    setError("");
    setMessage("");
    setData((previous) => previous ? optimisticUpdate(previous, body) : previous);
    pendingBidCount.current += 1;
    setPendingBids(pendingBidCount.current);
    const request = bidQueue.current.then(async () => {
      const response = await fetch(`/api/admin/auctions/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Bid update failed.");
      if (body.action === "correct_bid") await load();
    });
    bidQueue.current = request.catch((reason: unknown) => {
      failedBidQueue.current = true;
      setError(reason instanceof Error ? reason.message : "Bid update failed.");
    }).then(async () => {
      pendingBidCount.current -= 1;
      setPendingBids(pendingBidCount.current);
      if (pendingBidCount.current === 0 && failedBidQueue.current) {
        failedBidQueue.current = false;
        try {
          await load();
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : "Unable to refresh auction after bid error.");
        }
      }
    });
  }

  async function uploadLogo(event: React.ChangeEvent<HTMLInputElement>, type: "team" | "sponsor" | "background" | "tournament" | "organizer") {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError("");
    try {
      const url = await uploadAsset(file, type);
      if (type === "team") setTeamLogo(url);
      else if (type === "sponsor") setSponsorLogo(url);
      else if (type === "background") setBackgroundUrl(url);
      else if (type === "tournament") setTournamentLogoUrl(url);
      else setOrganizerLogoUrls((current) => [...current.split(/\r?\n/).map((item) => item.trim()).filter(Boolean), url].join("\n"));
      setMessage(type === "background" ? "Background uploaded; save it to apply to public and projector pages." : "Image uploaded; save presentation settings to apply it.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Logo upload failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  if (!data) return <main className="min-h-screen bg-slate-50 p-8">{error || "Loading auction…"}</main>;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-7 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/auctions" className="text-sm font-bold text-orange-700 hover:text-orange-800">← Auction list</Link>
        <header className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Auction control room</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">{data.tournament.name}</h1>
            <p className="mt-1 text-sm text-slate-500">Public page: <Link className="font-bold text-orange-700" href={`/auction/${data.tournament.slug}`} target="_blank">/auction/{data.tournament.slug} ↗</Link></p>
          </div>
          <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase text-slate-700 shadow-sm">{data.tournament.status}</span>
        </header>
        <nav className="mt-5 flex flex-wrap gap-2">
          <Link href={`/admin/auctions/${slug}`} className={`rounded-lg border px-4 py-2 text-sm font-bold ${view === "setup" ? "border-orange-300 bg-orange-50 text-orange-800" : "border-slate-300 bg-white text-slate-700"}`}>Tournament setup</Link>
          <Link href={`/admin/auctions/${slug}/run`} className={`rounded-lg border px-4 py-2 text-sm font-bold ${view === "run" ? "border-orange-300 bg-orange-50 text-orange-800" : "border-slate-300 bg-white text-slate-700"}`}>Run auction</Link>
          <Link href={`/auction/${slug}`} target="_blank" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">Open viewer page ↗</Link>
          <Link href={`/auction/${slug}/projector`} target="_blank" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">Open projector ↗</Link>
        </nav>
        {view === "run" && <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href={`/admin/auctions/${slug}`} className="rounded-xl border border-slate-200 bg-white p-4 text-sm hover:border-orange-300"><span className="block font-extrabold text-slate-900">Admin setup</span><span className="mt-1 block text-slate-600">Customize teams, players, sponsors and background.</span></Link>
          <Link href={`/auction/${slug}/projector`} target="_blank" className="rounded-xl border border-slate-200 bg-white p-4 text-sm hover:border-orange-300"><span className="block font-extrabold text-slate-900">Projector link ↗</span><span className="mt-1 block text-slate-600">Fullscreen live auction, teams and player tabs.</span></Link>
          <Link href={`/auction/${slug}`} target="_blank" className="rounded-xl border border-slate-200 bg-white p-4 text-sm hover:border-orange-300"><span className="block font-extrabold text-slate-900">Owner / viewer link ↗</span><span className="mt-1 block text-slate-600">Concise public scoreboard to share with everyone.</span></Link>
        </div>}

        {(error || message) && <p role={error ? "alert" : "status"} className={`mt-5 rounded-lg px-4 py-3 text-sm font-semibold ${error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>{error || message}</p>}

        {view === "setup" && <>
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Teams", data.teams.length], ["Players", data.players.length], ["Sold", soldPlayers], ["Unsold", unsoldPlayers]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div>
          ))}
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Public page background</h2>
            <p className="mt-1 text-sm text-slate-600">Choose the background shown on the owner/viewer page and projector. For projection, use a landscape, high-resolution image.</p>
            <label className="mt-4 block text-xs font-bold text-slate-600">Background image URL<input value={backgroundUrl} onChange={(event) => setBackgroundUrl(event.target.value)} className={inputClass} placeholder="https://…" /></label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Upload background<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadLogo(event, "background")} /></label>
              <button className={buttonClass} disabled={busy} onClick={() => void action({ action: "background", backgroundUrl: backgroundUrl.trim() || null })}>Save background</button>
              {backgroundUrl && <button className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700" disabled={busy} onClick={() => { setBackgroundUrl(""); void action({ action: "background", backgroundUrl: null }); }}>Remove background</button>}
            </div>
            {backgroundUrl && <AuctionImage src={backgroundUrl} alt="Selected auction background preview" width={640} height={200} className="mt-4 h-36 w-full rounded-lg border border-slate-200 object-cover" />}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Projector branding</h2>
            <p className="mt-1 text-sm text-slate-600">The projector rotates organizer logos on the left and sponsor logos on the right, with the tournament logo in the center.</p>
            <label className="mt-4 block text-xs font-bold text-slate-600">Tournament logo URL<input value={tournamentLogoUrl} onChange={(event) => setTournamentLogoUrl(event.target.value)} className={inputClass} placeholder="https://…" /></label>
            <label className="mt-3 block text-xs font-bold text-slate-600">Organizer logo URLs <span className="font-normal text-slate-500">(one per line)</span><textarea rows={3} value={organizerLogoUrls} onChange={(event) => setOrganizerLogoUrls(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-orange-500" placeholder="https://logo-one.png&#10;https://logo-two.png" /></label>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Upload tournament logo<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadLogo(event, "tournament")} /></label>
              <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Add organizer logo<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadLogo(event, "organizer")} /></label>
              <button className={buttonClass} disabled={busy} onClick={() => void action({ action: "presentation", tournamentLogoUrl: tournamentLogoUrl.trim() || null, organizerLogoUrls: organizerLogoUrls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean) })}>Save projector logos</button>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Auction rules</h2>
            <form onSubmit={submitRules} className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["pointsPerTeam", "Points per team", data.tournament.points_per_team, 0],
                ["basePrice", "Player base price", data.tournament.base_price, 0],
                ["minSquadSize", "Minimum squad size", data.tournament.min_squad_size, 0],
                ["maxSquadSize", "Maximum squad size", data.tournament.max_squad_size, 1],
              ].map(([key, label, value, min]) => <label key={key} className="text-xs font-bold text-slate-600">{label}<input className={inputClass} type="number" name={String(key)} min={Number(min)} step={key === "minSquadSize" || key === "maxSquadSize" ? 1 : 0.01} defaultValue={Number(value)} required disabled={busy} /></label>)}
              <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-slate-900">Bid increment rules</p><p className="text-xs text-slate-500">The increment is selected from the current highest bid.</p></div><button type="button" disabled={busy} onClick={() => setIncrementRules((rules) => [...rules, { from: (rules.at(-1)?.from ?? 0) + 1, increment: rules.at(-1)?.increment ?? data.tournament.bid_increment }])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">Add range</button></div><div className="mt-3 grid gap-2">{incrementRules.map((rule, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"><label className="text-xs font-bold text-slate-600">From bid<input className={inputClass} type="number" min={0} step="0.01" value={rule.from} disabled={busy || index === 0} onChange={(event) => setIncrementRules((rules) => rules.map((item, itemIndex) => itemIndex === index ? { ...item, from: Number(event.target.value) } : item))} /></label><label className="text-xs font-bold text-slate-600">Increment<input className={inputClass} type="number" min="0.01" step="0.01" value={rule.increment} disabled={busy} onChange={(event) => setIncrementRules((rules) => rules.map((item, itemIndex) => itemIndex === index ? { ...item, increment: Number(event.target.value) } : item))} /></label><button type="button" disabled={busy || index === 0} onClick={() => setIncrementRules((rules) => rules.filter((_, itemIndex) => itemIndex !== index))} className="h-10 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-700 disabled:opacity-50">Remove</button></div>)}</div></div>
              <div className="col-span-2"><button disabled={busy} className={buttonClass}>Save rules</button><p className="mt-2 text-xs text-slate-500">Rules stay editable. Changing team points adjusts each remaining budget by the same difference.</p></div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Teams</h2>
            <form onSubmit={addTeam} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Team name<input value={teamName} onChange={(event) => setTeamName(event.target.value)} className={inputClass} maxLength={120} required /></label>
              <label className="text-xs font-bold text-slate-600">Logo image URL or upload<input value={teamLogo} onChange={(event) => setTeamLogo(event.target.value)} className={inputClass} placeholder="https://…" /></label>
              <div className="flex items-center gap-3 sm:col-span-2">
                <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadLogo(event, "team")} /></label>
                <button disabled={busy || data.tournament.status !== "setup"} className={buttonClass}>Add team</button>
              </div>
            </form>
            <div className="mt-4 grid gap-2">{data.teams.map((team) => <div key={team.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex min-w-0 items-center gap-3"><TeamMark name={team.name} logoUrl={team.logo_url} size="sm" /><div><p className="font-bold text-slate-900">{team.name}</p><p className="text-xs text-slate-500">{team.points_remaining} pts remaining</p></div></div><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => setEditingTeam({ id: team.id, name: team.name, logo_url: team.logo_url })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">Edit team</button><button type="button" disabled={busy || data.tournament.status !== "setup"} onClick={() => void deleteTeam(team)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Delete</button></div></div>)}</div>
            {data.tournament.status !== "setup" && <p className="mt-3 text-xs text-slate-500">Team names and logos remain editable after the auction begins. Adding or deleting teams is available before it starts.</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Player pool</h2>
            <p className="mt-1 text-sm text-slate-600">Download the template, fill in one player per row, then upload the completed workbook. Name and Category are required; Player Number is optional and defaults to the row number.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={downloadPlayerTemplate}>Download Excel template</button>
              <label className={`inline-flex cursor-pointer items-center ${buttonClass}`}>{busy ? "Working…" : "Upload completed Excel"}<input type="file" accept=".xlsx,.xls" disabled={busy} className="sr-only" onChange={(event) => void importPlayers(event)} /></label>
            </div>
            <p className="mt-3 text-xs text-slate-500">Import new players at any time. Player records are shown publicly without contact or identity details.</p>
            {error && <p className="mt-2 text-sm font-semibold text-red-700">Upload error: {error}</p>}
            <p className="mt-2 text-sm font-semibold text-slate-700">{availablePlayers.length} available · {soldPlayers} sold · {unsoldPlayers} unsold</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Sponsors</h2>
            <form onSubmit={addSponsor} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Sponsor name<input value={sponsorName} onChange={(event) => setSponsorName(event.target.value)} className={inputClass} maxLength={120} required /></label>
              <label className="text-xs font-bold text-slate-600">Logo image URL or upload<input value={sponsorLogo} onChange={(event) => setSponsorLogo(event.target.value)} className={inputClass} placeholder="https://…" /></label>
              <label className="text-xs font-bold text-slate-600">Website URL<input value={sponsorWebsite} onChange={(event) => setSponsorWebsite(event.target.value)} className={inputClass} placeholder="https://…" /></label>
              <div className="flex items-end gap-3">
                <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadLogo(event, "sponsor")} /></label>
                <button disabled={busy} className={buttonClass}>Add sponsor</button>
              </div>
            </form>
            <div className="mt-4 grid gap-2">{data.sponsors.map((sponsor) => <div key={sponsor.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"><div className="flex min-w-0 items-center gap-2">{sponsor.logo_url && <AuctionImage src={sponsor.logo_url} alt="" width={32} height={32} className="h-8 w-8 object-contain" />}<span>{sponsor.name}</span></div><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => setEditingSponsor({ ...sponsor })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">Edit</button><button type="button" disabled={busy} onClick={() => setPendingDeleteSponsor(sponsor)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Delete</button></div></div>)}</div>
          </section>
        </div>
        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5"><h2 className="font-black text-slate-900">Players · individual editing</h2><p className="mt-1 text-sm text-slate-600">Edit player details without re-importing the spreadsheet.</p></div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-3">#</th><th className="p-3">Player</th><th className="p-3">Category</th><th className="p-3">Status</th><th className="p-3">Edit</th></tr></thead>
              <tbody>{data.players.map((player) => <tr key={player.id} className="border-t border-slate-100"><td className="p-3 font-bold">{player.player_number}</td><td className="p-3 font-semibold">{player.full_name}</td><td className="p-3">{player.category}</td><td className="p-3 capitalize">{player.status}</td><td className="p-3"><button type="button" onClick={() => setEditingPlayer({ id: player.id, player_number: player.player_number, full_name: player.full_name, category: player.category, role: player.role, batting_style: player.batting_style, bowling_style: player.bowling_style, previous_team: player.previous_team, photo_url: player.photo_url })} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold hover:bg-slate-50">Edit player</button></td></tr>)}</tbody>
            </table>
          </div>
        </section>
        <section className="mt-7 flex flex-col justify-between gap-4 rounded-2xl border border-orange-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-black text-slate-950">Ready to host?</h2>
            <p className="mt-1 text-sm text-slate-600">Open the dedicated auction control page to start or run the live auction.</p>
          </div>
          <Link href={`/admin/auctions/${slug}/run`} className={buttonClass}>Open auction console →</Link>
        </section>
        </>}

        {view === "run" && <section className="mt-7 rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-orange-700">Live host console</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Run the auction</h2>
              <p className="mt-1 text-sm text-slate-600">Only admins control the auction. Public and team pages update live and are view-only.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.tournament.status === "setup" && <button className={buttonClass} disabled={busy} onClick={() => void action({ action: "start" })}>Start auction</button>}
              {data.tournament.status === "paused" && <button className={buttonClass} disabled={busy} onClick={() => void action({ action: "resume" })}>Resume auction</button>}
              {data.tournament.status === "live" && <button className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold" disabled={busy} onClick={() => void action({ action: "pause" })}>Pause</button>}
              {data.tournament.status !== "completed" && data.tournament.status !== "setup" && <button className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-bold text-red-700" disabled={busy} onClick={() => void action({ action: "complete" })}>Complete auction</button>}
            </div>
          </div>

          {data.tournament.status === "live" && (
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="font-extrabold text-slate-900">Call a player</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-600">Selection method<select value={selectionMode} onChange={(event) => setSelectionMode(event.target.value)} className={inputClass}><option value="random">Random available player</option><option value="number">By player number</option><option value="category">Random by category</option><option value="unsold">Re-auction unsold player</option></select></label>
                  {selectionMode === "number" ? <label className="text-xs font-bold text-slate-600">Player number<input type="number" min={1} value={selectedPlayerNumber} onChange={(event) => setSelectedPlayerNumber(event.target.value)} className={inputClass} placeholder="Enter player number" /><span className="mt-1 block font-normal">{numberSelectedPlayer ? `${numberSelectedPlayer.full_name} · ${numberSelectedPlayer.category} · ${numberSelectedPlayer.status}` : "Enter any player number to call or re-auction"}</span></label> :
                    <label className="text-xs font-bold text-slate-600">Category<select value={selectionCategory} onChange={(event) => setSelectionCategory(event.target.value)} className={inputClass}><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>}
                  <button className={`${buttonClass} sm:col-span-2`} disabled={busy || pendingBids > 0 || (selectionMode === "number" ? !numberSelectedPlayer || numberSelectedPlayer.id === currentPlayer?.id : selectionMode === "unsold" ? unsoldPlayers === 0 : availablePlayers.length === 0)} onClick={() => void selectPlayer()}>{selectionMode === "number" ? numberSelectedPlayer?.status === "sold" || numberSelectedPlayer?.status === "unsold" ? "Re-auction selected player" : "Call selected player" : selectionMode === "unsold" ? "Pick an unsold player" : selectionMode === "category" ? "Pick player from category" : "Pick random player"}</button>
                  {selectionMode === "random" && currentPlayer && <p className="text-xs text-slate-600 sm:col-span-2">Calling another random player replaces the current player without marking them sold or unsold.</p>}
                </div>
                {availablePlayers.length === 0 && <p className="mt-3 text-sm font-semibold text-slate-600">No available players remain.</p>}
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="font-extrabold text-slate-900">Current bid</h3>
                {currentPlayer ? <>
                  <div className="relative mt-3 flex items-center gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
                    {currentPlayer.status !== "available" && <AuctionResultTag status={currentPlayer.status} />}
                    {currentPlayer.photo_url && <AuctionImage src={currentPlayer.photo_url} alt="" width={64} height={64} className="h-16 w-16 rounded-lg object-cover" />}
                    <div><p className="text-xs font-bold uppercase text-orange-700">Player #{currentPlayer.player_number} · {currentPlayer.category}</p><p className="mt-1 text-xl font-black text-slate-950">{currentPlayer.full_name}</p><p className="text-sm text-slate-600">{currentPlayer.role || "Player"}{currentPlayer.previous_team ? ` · ${currentPlayer.previous_team}` : ""}</p></div>
                  </div>
                  {currentPlayer.status === "sold" ? <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-2xl font-black text-slate-950">{currentPlayer.sold_price ?? 0} points</p>
                    <p className="text-sm text-slate-600">Sold to {data.teams.find((team) => team.id === currentPlayer.sold_team_id)?.name ?? "team"}.</p>
                  </div> : currentPlayer.status === "unsold" ? null : <>
                    <p className="mt-4 text-3xl font-black text-slate-950">{data.tournament.current_bid ?? data.tournament.base_price} <span className="text-sm font-bold text-slate-500">points</span></p>
                    <p className="text-sm text-slate-600">{currentTeam ? `Highest bid: ${currentTeam.name}` : "No bids yet"}</p>
                    <label className="mt-3 block text-xs font-bold text-slate-600">Bid amount (uses the matching increment range)<div className="mt-1 flex overflow-hidden rounded-lg border border-slate-300 bg-white"><button type="button" onClick={() => adjustBid("down")} disabled={Number(bidAmount) <= minimumSelectableBid} className="w-10 border-r border-slate-300 text-lg font-black text-slate-700 disabled:opacity-40">−</button><input value={bidAmount} onChange={(event) => setBidDraft({ key: bidDraftKey, value: event.target.value })} onKeyDown={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); adjustBid(event.key === "ArrowUp" ? "up" : "down"); } }} type="number" min={minimumSelectableBid} step="any" className="bid-amount h-10 min-w-0 flex-1 px-3 text-sm font-normal outline-none" /><button type="button" onClick={() => adjustBid("up")} className="w-10 border-l border-slate-300 text-lg font-black text-slate-700">+</button></div></label>
                    {data.tournament.current_bid != null && <p className="mt-1 text-xs text-slate-500">To correct the current bid, enter a lower amount and select the team. New higher bids still follow the configured increment.</p>}
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Select highest bidder{pendingBids > 0 ? " · Updating" : ""}</p>
                      <div className="mt-2 flex flex-wrap gap-2">{data.teams.map((team) => <button key={team.id} disabled={Number(bidAmount) < minimumSelectableBid || Number(bidAmount) > maximumBidForTeam(team)} title={`Maximum bid ${maximumBidForTeam(team)} · reserve ${reserveForTeam(team)}`} className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-extrabold text-orange-800 hover:bg-orange-50 disabled:opacity-40" onClick={() => void placeTeamBid(team)}>{team.name}</button>)}</div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button disabled={busy || pendingBids > 0 || !data.tournament.current_bid_team_id} className={buttonClass} onClick={() => void action({ action: "finalize", result: "sold" })}>Sold</button>
                      <button disabled={busy || pendingBids > 0} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold" onClick={() => void action({ action: "finalize", result: "unsold" })}>Unsold</button>
                      <button disabled={busy || pendingBids > 0} className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900" onClick={() => void skipCurrentPlayer()}>SKIP</button>
                    </div>
                  </>}
                </> : <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">No player is currently on the auction block.</p>}
              </div>
            </div>
          )}
        </section>}

        {view === "run" && <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5"><h2 className="font-black text-slate-900">Player pool status</h2></div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-3">#</th><th className="p-3">Player</th><th className="p-3">Category</th><th className="p-3">Status</th><th className="p-3">Team</th><th className="p-3">Sold for</th><th className="p-3">Actions</th></tr></thead>
              <tbody>{data.players.map((player) => <tr key={player.id} className={`border-t border-slate-100 ${currentPlayer?.id === player.id ? "bg-orange-50" : ""}`}><td className="p-3 font-bold">{player.player_number}</td><td className="p-3 font-semibold">{player.full_name}</td><td className="p-3">{player.category}</td><td className="p-3 capitalize">{player.status}</td><td className="p-3">{data.teams.find((team) => team.id === player.sold_team_id)?.name ?? "—"}</td><td className="p-3">{player.sold_price ?? "—"}</td><td className="flex gap-2 p-3"><button type="button" disabled={busy || data.tournament.status !== "live" || currentPlayer?.id === player.id} onClick={() => void selectPlayerFromTable(player)} className="rounded-lg border border-orange-200 px-2 py-1 text-xs font-bold text-orange-800 disabled:opacity-50">{currentPlayer?.id === player.id ? "On block" : player.status === "available" ? "Call player" : "Re-auction"}</button><button type="button" disabled={busy} onClick={() => setEditingPlayer({ id: player.id, player_number: player.player_number, full_name: player.full_name, category: player.category, role: player.role, batting_style: player.batting_style, bowling_style: player.bowling_style, previous_team: player.previous_team, photo_url: player.photo_url })} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold disabled:opacity-50">Edit</button></td></tr>)}</tbody>
            </table>
          </div>
        </section>}
        {editingTeam && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 p-4">
          <form onSubmit={saveTeam} className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-orange-700">Team settings</p><h2 className="mt-1 text-xl font-black text-slate-950">Update team</h2></div><button type="button" onClick={() => setEditingTeam(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold">Close</button></div>
            <label className="mt-5 block text-xs font-bold text-slate-600">Team name<input value={editingTeam.name} onChange={(event) => setEditingTeam({ ...editingTeam, name: event.target.value })} className={inputClass} maxLength={120} required /></label>
            <label className="mt-3 block text-xs font-bold text-slate-600">Team logo URL<input value={editingTeam.logo_url ?? ""} onChange={(event) => setEditingTeam({ ...editingTeam, logo_url: event.target.value || null })} className={inputClass} placeholder="https://…" /></label>
            <div className="mt-3 flex items-center gap-3"><label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="sr-only" onChange={(event) => void uploadEditedTeamLogo(event)} /></label><TeamMark name={editingTeam.name} logoUrl={editingTeam.logo_url} size="sm" /></div>
            <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setEditingTeam(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={busy} className={buttonClass}>{busy ? "Saving…" : "Save team"}</button></div>
          </form>
        </div>}
        {editingSponsor && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 p-4">
          <form onSubmit={saveSponsor} className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-orange-700">Sponsor settings</p><h2 className="mt-1 text-xl font-black text-slate-950">Update sponsor</h2></div><button type="button" onClick={() => setEditingSponsor(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold">Close</button></div>
            <label className="mt-5 block text-xs font-bold text-slate-600">Sponsor name<input value={editingSponsor.name} onChange={(event) => setEditingSponsor({ ...editingSponsor, name: event.target.value })} className={inputClass} maxLength={120} required /></label>
            <label className="mt-3 block text-xs font-bold text-slate-600">Logo image URL<input value={editingSponsor.logo_url ?? ""} onChange={(event) => setEditingSponsor({ ...editingSponsor, logo_url: event.target.value || null })} className={inputClass} placeholder="https://…" /></label>
            <label className="mt-3 block text-xs font-bold text-slate-600">Website URL<input value={editingSponsor.website_url ?? ""} onChange={(event) => setEditingSponsor({ ...editingSponsor, website_url: event.target.value || null })} className={inputClass} placeholder="https://…" /></label>
            <div className="mt-3 flex items-center gap-3"><label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="sr-only" onChange={(event) => void uploadEditedSponsorLogo(event)} /></label>{editingSponsor.logo_url && <AuctionImage src={editingSponsor.logo_url} alt="Sponsor logo preview" width={32} height={32} className="h-8 w-8 object-contain" />}</div>
            <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setEditingSponsor(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={busy} className={buttonClass}>{busy ? "Saving…" : "Save sponsor"}</button></div>
          </form>
        </div>}
        {pendingReauctionPlayer && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setPendingReauctionPlayer(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="reauction-title" className="w-full max-w-md animate-in zoom-in-95 rounded-2xl border border-white/70 bg-white p-6 shadow-2xl duration-200">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-orange-100 text-2xl">
                {pendingReauctionPlayer.photo_url ? <AuctionImage src={pendingReauctionPlayer.photo_url} alt="" width={56} height={56} className="h-14 w-14 object-cover" /> : "🏏"}
              </div>
              <div className="min-w-0"><p className="text-xs font-black uppercase tracking-wider text-orange-700">Player action</p><h2 id="reauction-title" className="mt-1 text-xl font-black text-slate-950">Re-auction player?</h2><p className="mt-1 font-bold text-slate-800">{pendingReauctionPlayer.full_name}</p><p className="mt-2 text-sm leading-relaxed text-slate-600">This player was previously sold to {data.teams.find((team) => team.id === pendingReauctionPlayer.sold_team_id)?.name ?? "a team"} for {pendingReauctionPlayer.sold_price ?? 0} points. Re-auctioning returns those points to that team.</p></div>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setPendingReauctionPlayer(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button><button type="button" disabled={busy} onClick={() => void confirmReauction()} className={buttonClass}>{busy ? "Updating…" : "Re-auction player"}</button></div>
          </section>
        </div>}
        {pendingDeleteTeam && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setPendingDeleteTeam(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="delete-team-title" className="w-full max-w-md animate-in zoom-in-95 rounded-2xl border border-white/70 bg-white p-6 shadow-2xl duration-200">
            <p className="text-xs font-black uppercase tracking-wider text-red-700">Team settings</p><h2 id="delete-team-title" className="mt-1 text-xl font-black text-slate-950">Delete {pendingDeleteTeam.name}?</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">This removes the team from this tournament. You can only delete a team before the auction starts.</p>
            <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setPendingDeleteTeam(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button><button type="button" disabled={busy} onClick={() => void confirmDeleteTeam()} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-50">{busy ? "Deleting…" : "Delete team"}</button></div>
          </section>
        </div>}
        {pendingDeleteSponsor && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setPendingDeleteSponsor(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="delete-sponsor-title" className="w-full max-w-md animate-in zoom-in-95 rounded-2xl border border-white/70 bg-white p-6 shadow-2xl duration-200">
            <p className="text-xs font-black uppercase tracking-wider text-red-700">Sponsor settings</p><h2 id="delete-sponsor-title" className="mt-1 text-xl font-black text-slate-950">Delete {pendingDeleteSponsor.name}?</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">This removes the sponsor from this tournament and its public auction pages.</p>
            <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setPendingDeleteSponsor(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button><button type="button" disabled={busy} onClick={() => void confirmDeleteSponsor()} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-50">{busy ? "Deleting…" : "Delete sponsor"}</button></div>
          </section>
        </div>}
        {editingPlayer && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 p-4">
          <form onSubmit={savePlayer} className="my-auto max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-orange-700">Player editor</p><h2 className="mt-1 text-xl font-black text-slate-950">{editingPlayer.full_name}</h2></div><button type="button" onClick={() => setEditingPlayer(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold">Close</button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Player number<input type="number" min={1} value={editingPlayer.player_number} onChange={(event) => updateEditingPlayer("player_number", Number(event.target.value))} className={inputClass} required /></label>
              <label className="text-xs font-bold text-slate-600">Full name<input value={editingPlayer.full_name} onChange={(event) => updateEditingPlayer("full_name", event.target.value)} className={inputClass} maxLength={160} required /></label>
              <label className="text-xs font-bold text-slate-600">Category<input value={editingPlayer.category} onChange={(event) => updateEditingPlayer("category", event.target.value)} className={inputClass} maxLength={80} required /></label>
              <label className="text-xs font-bold text-slate-600">Role<input value={editingPlayer.role ?? ""} onChange={(event) => updateEditingPlayer("role", event.target.value || null)} className={inputClass} maxLength={100} /></label>
              <label className="text-xs font-bold text-slate-600">Batting style<input value={editingPlayer.batting_style ?? ""} onChange={(event) => updateEditingPlayer("batting_style", event.target.value || null)} className={inputClass} maxLength={100} /></label>
              <label className="text-xs font-bold text-slate-600">Bowling style<input value={editingPlayer.bowling_style ?? ""} onChange={(event) => updateEditingPlayer("bowling_style", event.target.value || null)} className={inputClass} maxLength={100} /></label>
              <label className="text-xs font-bold text-slate-600">Previous team<input value={editingPlayer.previous_team ?? ""} onChange={(event) => updateEditingPlayer("previous_team", event.target.value || null)} className={inputClass} maxLength={120} /></label>
              <label className="text-xs font-bold text-slate-600">Player photo URL<input value={editingPlayer.photo_url ?? ""} onChange={(event) => updateEditingPlayer("photo_url", event.target.value || null)} className={inputClass} /></label>
            </div>
            <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setEditingPlayer(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={busy} className={buttonClass}>{busy ? "Saving…" : "Save player"}</button></div>
          </form>
        </div>}
      </div>
    </main>
  );
}
