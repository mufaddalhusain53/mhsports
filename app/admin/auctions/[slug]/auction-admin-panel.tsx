"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import AuctionImage from "@/app/components/AuctionImage";
import AuctionResultTag from "@/app/auction/AuctionResultTag";
import TeamMark from "@/app/auction/TeamMark";
import { sortSponsors } from "@/lib/auction/sponsors";
import { getAuctionBasePrice, upsertAuctionCategory } from "@/lib/auction/pricing";
import { PROJECTOR_PLAYER_FIELDS, type ProjectorPlayerField } from "@/lib/auction/projector-fields";
import type { ProjectorTheme } from "@/lib/auction/projector-theme";
import { supabase } from "@/lib/supabase/client";

type Team = { id: string; name: string; slug: string; logo_url: string | null; points_remaining: number; rtm_count: number };
type Player = {
  id: string; player_number: number; full_name: string; category: string; category_id: string; role: string | null;
  batting_style: string | null; bowling_style: string | null; previous_team: string | null; photo_url: string | null;
  status: "available" | "sold" | "unsold"; sold_team_id: string | null; sold_price: number | null; rtm_team_id: string | null;
};
type Sponsor = { id: string; name: string; sponsor_title: string | null; logo_url: string | null; website_url: string | null; display_order: number };
type AuctionCategory = { id: string; name: string; base_price: number; min_players: number; max_players: number };
type IncrementRule = { from: number; increment: number };
type Tournament = {
  id: string; slug: string; name: string; status: string; auction_mode: "trial" | "live"; scheduled_date: string | null; rtm_enabled: boolean; points_per_team: number; base_price: number;
  bid_increment: number; bid_increment_rules: IncrementRule[]; min_squad_size: number; max_squad_size: number; current_player_id: string | null;
  current_bid: number | null; current_bid_team_id: string | null; background_url: string | null;
  tournament_logo_url: string | null; organizer_logo_urls: string[]; projector_player_fields: ProjectorPlayerField[]; projector_theme: ProjectorTheme;
};
type AuctionData = { tournament: Tournament; teams: Team[]; players: Player[]; sponsors: Sponsor[]; categories: AuctionCategory[] };
type PlayerFormData = Omit<Player, "category_id" | "status" | "sold_team_id" | "sold_price" | "rtm_team_id">;
type TeamFormData = Pick<Team, "id" | "name" | "logo_url" | "rtm_count">;
type SponsorFormData = Sponsor;
type CategoryFormData = { id: string; name: string; basePrice: string; minPlayers: string; maxPlayers: string };
type SetupTab = "overview" | "rules" | "teams" | "players" | "branding" | "sponsors";

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
  const [teamRTM, setTeamRTM] = useState("0");
  const [tournamentName, setTournamentName] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [tournamentLogoUrl, setTournamentLogoUrl] = useState("");
  const [organizerLogoUrls, setOrganizerLogoUrls] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [rtmEnabled, setRtmEnabled] = useState(true);
  const [projectorFields, setProjectorFields] = useState<ProjectorPlayerField[]>(() => PROJECTOR_PLAYER_FIELDS.map((field) => field.id));
  const [projectorTheme, setProjectorTheme] = useState<ProjectorTheme>("classic");
  const [setupTab, setSetupTab] = useState<SetupTab>("overview");
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorTitle, setSponsorTitle] = useState("");
  const [sponsorLogo, setSponsorLogo] = useState("");
  const [sponsorWebsite, setSponsorWebsite] = useState("");
  const [incrementRules, setIncrementRules] = useState<IncrementRule[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({ id: "", name: "", basePrice: "0", minPlayers: "0", maxPlayers: "25" });
  const [selectionMode, setSelectionMode] = useState("random");
  const [selectionCategory, setSelectionCategory] = useState("");
  const [appliedSelectionMode, setAppliedSelectionMode] = useState("random");
  const [appliedSelectionCategory, setAppliedSelectionCategory] = useState("");
  const [playerPoolFilter, setPlayerPoolFilter] = useState("");
  const [playerPoolSearchMode, setPlayerPoolSearchMode] = useState<"name" | "number">("name");
  const [bidDraft, setBidDraft] = useState<{ key: string; value: string } | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<PlayerFormData | null>(null);
  const [editingTeam, setEditingTeam] = useState<TeamFormData | null>(null);
  const [editingSponsor, setEditingSponsor] = useState<SponsorFormData | null>(null);
  const [pendingReauctionPlayer, setPendingReauctionPlayer] = useState<Player | null>(null);
  const [pendingRTMPlayer, setPendingRTMPlayer] = useState<Player | null>(null);
  const [pendingDeleteTeam, setPendingDeleteTeam] = useState<Team | null>(null);
  const [pendingDeleteSponsor, setPendingDeleteSponsor] = useState<Sponsor | null>(null);
  const [pendingDeletePlayer, setPendingDeletePlayer] = useState<Player | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetPin, setResetPin] = useState("");
  const [pendingMode, setPendingMode] = useState<"trial" | "live" | null>(null);
  const [modePin, setModePin] = useState("");
  const [pendingBids, setPendingBids] = useState(0);
  const bidQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingBidCount = useRef(0);
  const failedBidQueue = useRef(false);

  const load = useCallback(async () => {
    setBidDraft(null);
    const response = await fetch(`/api/admin/auctions/${encodeURIComponent(slug)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load auction.");
    setData(result);
    setTournamentName(result.tournament.name);
    setBackgroundUrl(result.tournament.background_url ?? "");
    setTournamentLogoUrl(result.tournament.tournament_logo_url ?? "");
    setOrganizerLogoUrls((result.tournament.organizer_logo_urls ?? []).join("\n"));
    setScheduledDate(result.tournament.scheduled_date ?? "");
    setRtmEnabled(result.tournament.rtm_enabled);
    setProjectorFields(result.tournament.projector_player_fields);
    setProjectorTheme(result.tournament.projector_theme);
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
          setTournamentName(result.tournament.name);
          setBackgroundUrl(result.tournament.background_url ?? "");
          setTournamentLogoUrl(result.tournament.tournament_logo_url ?? "");
          setOrganizerLogoUrls((result.tournament.organizer_logo_urls ?? []).join("\n"));
          setScheduledDate(result.tournament.scheduled_date ?? "");
          setRtmEnabled(result.tournament.rtm_enabled);
          setProjectorFields(result.tournament.projector_player_fields);
          setProjectorTheme(result.tournament.projector_theme);
          setIncrementRules(incrementRulesFor(result.tournament));
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load auction.");
      });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!data?.tournament.id) return;
    const tournamentId = data.tournament.id;
    const channel = supabase.channel(`admin-auction-${tournamentId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "auction_tournaments", filter: `slug=eq.${slug}` }, ({ new: row }) => {
        setBidDraft(null);
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
        const row = change.new as AuctionCategory;
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

  const availablePlayers = useMemo(() => (data?.players ?? []).filter((player) => player.status === "available"), [data?.players]);
  const soldCountsByTeam = useMemo(() => {
    const counts = new Map<string, number>();
    const countsByCategory = new Map<string, number>();
    for (const player of data?.players ?? []) {
      if (player.status !== "sold" || !player.sold_team_id) continue;
      counts.set(player.sold_team_id, (counts.get(player.sold_team_id) ?? 0) + 1);
      const key = `${player.sold_team_id}:${player.category_id}`;
      countsByCategory.set(key, (countsByCategory.get(key) ?? 0) + 1);
    }
    return { counts, countsByCategory };
  }, [data?.players]);
  const playerCategories = useMemo(() => Array.from(new Set(availablePlayers.map((player) => player.category))).sort(), [availablePlayers]);
  const currentPlayer = data?.players.find((player) => player.id === data.tournament.current_player_id);
  const currentCategory = data?.categories.find((category) => category.id === currentPlayer?.category_id);
  const currentTeam = data?.teams.find((team) => team.id === data.tournament.current_bid_team_id);
  const soldTeam = currentPlayer && currentPlayer.status === "sold" && currentPlayer.sold_team_id
    ? data?.teams.find((team) => team.id === currentPlayer.sold_team_id) ?? null
    : null;
  const soldPlayers = useMemo(
    () => Array.from(soldCountsByTeam.counts.values()).reduce((total, count) => total + count, 0),
    [soldCountsByTeam]
  );
  const unsoldPlayers = useMemo(() => (data?.players ?? []).filter((player) => player.status === "unsold").length, [data?.players]);
  const canSelectNextPlayer = useMemo(() => {
    const pool = availablePlayers.filter((player) => player.id !== currentPlayer?.id);
    const candidates = appliedSelectionCategory ? pool.filter((player) => player.category === appliedSelectionCategory) : pool;
    return candidates.length > 0;
  }, [availablePlayers, currentPlayer?.id, appliedSelectionCategory]);
  const queueSettingsDirty = selectionMode !== appliedSelectionMode || selectionCategory !== appliedSelectionCategory;
  const filteredPlayerPool = useMemo(() => {
    const query = playerPoolFilter.trim().toLowerCase();
    if (!query) return data?.players ?? [];
    return (data?.players ?? []).filter((player) => {
      if (playerPoolSearchMode === "number") {
        return String(player.player_number).includes(query);
      }
      return player.full_name.toLowerCase().includes(query);
    });
  }, [data?.players, playerPoolFilter, playerPoolSearchMode]);
  const currentBasePrice = data ? getAuctionBasePrice(currentPlayer, data.categories, data.tournament.base_price) : 0;
  const nextBid = data?.tournament.current_bid == null
    ? currentBasePrice
    : Math.round((data.tournament.current_bid + incrementForBid(data.tournament, data.tournament.current_bid)) * 100) / 100;
  function reserveForTeam(team: Team, categoryId = currentPlayer?.category_id) {
    if (!data) return 0;
    let remainingCategorySlots = 0;
    let categoryReserve = 0;
    const categoryCapacities: { basePrice: number; slots: number }[] = [];
    for (const category of data.categories) {
      const count = soldCountsByTeam.countsByCategory.get(`${team.id}:${category.id}`) ?? 0;
      const currentPlayerSlot = category.id === categoryId ? 1 : 0;
      const remaining = Math.max(category.min_players - count - currentPlayerSlot, 0);
      remainingCategorySlots += remaining;
      categoryReserve += remaining * category.base_price;
      categoryCapacities.push({
        basePrice: category.base_price,
        slots: Math.max(category.max_players - count - currentPlayerSlot - remaining, 0),
      });
    }
    let extraSquadSlots = Math.max(data.tournament.min_squad_size - (soldCountsByTeam.counts.get(team.id) ?? 0) - 1 - remainingCategorySlots, 0);
    for (const category of categoryCapacities.sort((left, right) => left.basePrice - right.basePrice)) {
      const reservedSlots = Math.min(extraSquadSlots, category.slots);
      categoryReserve += reservedSlots * category.basePrice;
      extraSquadSlots -= reservedSlots;
      if (!extraSquadSlots) break;
    }
    return extraSquadSlots ? Number.POSITIVE_INFINITY : categoryReserve;
  }
  function categoryLimitReached(team: Team, categoryId = currentPlayer?.category_id) {
    const category = data?.categories.find((item) => item.id === categoryId);
    if (!category) return false;
    const bought = soldCountsByTeam.countsByCategory.get(`${team.id}:${category.id}`) ?? 0;
    return bought >= category.max_players;
  }
  function maximumBidForTeam(team: Team) {
    const categoryBasePrice = currentCategory?.base_price ?? data?.tournament.base_price ?? 0;
    const rtmBoost = (team.rtm_count ?? 0) * categoryBasePrice;
    return Math.max(0, team.points_remaining - reserveForTeam(team) + rtmBoost);
  }

  const bidDraftKey = `${currentPlayer?.id ?? ""}:${data?.tournament.current_bid ?? "opening"}`;
  const bidAmount = bidDraft?.key === bidDraftKey ? bidDraft.value : String(nextBid ?? "");
  const minimumSelectableBid = data?.tournament.current_bid == null
    ? (nextBid ?? 0)
    : currentBasePrice;
  function adjustBid(direction: "up" | "down") {
    if (!data) return;
    const current = Number(bidAmount);
    const value = Number.isFinite(current) ? current : (data.tournament.current_bid ?? currentBasePrice);
    const increment = direction === "up"
      ? incrementForBid(data.tournament, value)
      : incrementForBid(data.tournament, Math.max(minimumSelectableBid, value - 0.01));
    const adjusted = direction === "up" ? value + increment : Math.max(minimumSelectableBid, value - increment);
    setBidDraft({ key: bidDraftKey, value: String(Math.round(adjusted * 100) / 100) });
  }

  function optimisticUpdate(previous: AuctionData, body: Record<string, unknown>): AuctionData {
    const tournament = previous.tournament;
    if (body.action === "select_player" && typeof body.playerId === "string") {
      const target = previous.players.find((player) => player.id === body.playerId);
      if (!target) return previous;
      const teams = previous.teams.map((team) => {
        if (team.id === target.sold_team_id) {
          return { ...team, points_remaining: team.points_remaining + (target.sold_price ?? 0) };
        }
        if (target.rtm_team_id && team.id === target.rtm_team_id) {
          return { ...team, rtm_count: (team.rtm_count ?? 0) + 1 };
        }
        return team;
      });
      return {
        ...previous,
        teams,
        players: previous.players.map((player) => player.id === target.id
          ? { ...player, status: "available", sold_team_id: null, sold_price: null, rtm_team_id: null }
          : player),
        tournament: { ...tournament, current_player_id: target.id, current_bid: null, current_bid_team_id: null },
      };
    }
    if (body.action === "rtm" && typeof body.playerId === "string" && typeof body.teamId === "string") {
      const player = previous.players.find((item) => item.id === body.playerId);
      if (!player || !player.sold_team_id) return previous;
      const currentOwner = previous.teams.find((team) => team.id === player.sold_team_id);
      const nextOwner = previous.teams.find((team) => team.id === body.teamId);
      if (!currentOwner || !nextOwner) return previous;
      const soldPrice = player.sold_price ?? 0;
      return {
        ...previous,
        teams: previous.teams.map((team) => {
          if (team.id === currentOwner.id) return { ...team, points_remaining: team.points_remaining + soldPrice };
          if (team.id === nextOwner.id) return { ...team, points_remaining: team.points_remaining - soldPrice, rtm_count: Math.max(0, (team.rtm_count ?? 0) - 1) };
          return team;
        }),
        players: previous.players.map((item) => item.id === player.id ? { ...item, sold_team_id: nextOwner.id } : item),
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
    if (body.action === "start" || body.action === "complete") {
      const status = body.action === "start" ? "live" : "completed";
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

  async function changeAuctionMode(mode: "trial" | "live") {
    if (!data || data.tournament.auction_mode === mode) return;
    setModePin("");
    setPendingMode(mode);
  }

  async function confirmAuctionModeChange() {
    if (!pendingMode) return;
    if (await action({ action: "set_mode", mode: pendingMode, adminPin: modePin })) {
      setPendingMode(null);
      setModePin("");
    }
  }

  async function confirmAuctionReset() {
    const succeeded = await action({
      action: "reset",
      ...(data?.tournament.auction_mode === "live" ? { adminPin: resetPin } : {}),
    });
    if (succeeded) {
      setResetDialogOpen(false);
      setResetPin("");
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

  async function saveTournamentName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action({ action: "tournament_name", name: tournamentName });
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await action({
      action: categoryForm.id ? "edit_category" : "add_category",
      ...(categoryForm.id ? { categoryId: categoryForm.id } : {}),
      name: categoryForm.name,
      basePrice: Number(categoryForm.basePrice),
      minPlayers: Number(categoryForm.minPlayers),
      maxPlayers: Number(categoryForm.maxPlayers),
    });
    if (saved) {
      setCategoryForm({ id: "", name: "", basePrice: "0", minPlayers: "0", maxPlayers: String(data?.tournament.max_squad_size ?? 25) });
      setMessage(categoryForm.id ? "Category updated." : "Category added.");
    }
  }

  function editCategory(category: AuctionCategory) {
    setCategoryForm({
      id: category.id,
      name: category.name,
      basePrice: String(category.base_price),
      minPlayers: String(category.min_players),
      maxPlayers: String(category.max_players),
    });
  }

  async function deleteCategory(category: AuctionCategory) {
    const deleted = await action({ action: "delete_category", categoryId: category.id });
    if (deleted) {
      if (categoryForm.id === category.id) {
        setCategoryForm({ id: "", name: "", basePrice: "0", minPlayers: "0", maxPlayers: String(data?.tournament.max_squad_size ?? 25) });
      }
      setMessage("Category deleted.");
    }
  }

  async function uploadAsset(file: File, type: "team" | "sponsor" | "player" | "background" | "tournament" | "organizer") {
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
        body: JSON.stringify({ action: "add_team", name: teamName, logoUrl: teamLogo, rtmCount: Number(teamRTM) || 0 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to add team.");
      setTeamName(""); setTeamLogo(""); setTeamRTM("0"); await load(); setMessage("Team added.");
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
      rtmCount: Number(editingTeam.rtm_count) || 0,
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
        body: JSON.stringify({ action: "add_sponsor", name: sponsorName, sponsorTitle, logoUrl: sponsorLogo, websiteUrl: sponsorWebsite }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to add sponsor.");
      setSponsorName(""); setSponsorTitle(""); setSponsorLogo(""); setSponsorWebsite(""); await load(); setMessage("Sponsor added.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to add sponsor."); }
    finally { setBusy(false); }
  }

  async function saveSponsor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSponsor) return;
    const saved = await action({ action: "edit_sponsor", sponsorId: editingSponsor.id, name: editingSponsor.name, sponsorTitle: editingSponsor.sponsor_title, logoUrl: editingSponsor.logo_url, websiteUrl: editingSponsor.website_url });
    if (saved) {
      setEditingSponsor(null);
      setMessage("Sponsor updated.");
    }
  }

  async function moveSponsor(index: number, direction: -1 | 1) {
    if (!data) return;
    const target = index + direction;
    if (target < 0 || target >= data.sponsors.length) return;
    const sponsorIds = data.sponsors.map((sponsor) => sponsor.id);
    [sponsorIds[index], sponsorIds[target]] = [sponsorIds[target], sponsorIds[index]];
    if (await action({ action: "reorder_sponsors", sponsorIds })) setMessage("Sponsor order updated.");
  }

  async function confirmDeleteSponsor() {
    if (!pendingDeleteSponsor) return;
    const succeeded = await action({ action: "delete_sponsor", sponsorId: pendingDeleteSponsor.id });
    if (succeeded) setPendingDeleteSponsor(null);
  }

  async function confirmDeletePlayer() {
    if (!pendingDeletePlayer) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/auctions/${encodeURIComponent(slug)}/players`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: pendingDeletePlayer.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to delete player.");
      setPendingDeletePlayer(null);
      await load();
      setMessage("Player deleted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete player.");
    } finally {
      setBusy(false);
    }
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

  async function uploadEditedPlayerPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editingPlayer) return;
    setBusy(true);
    setError("");
    try {
      const photoUrl = await uploadAsset(file, "player");
      updateEditingPlayer("photo_url", photoUrl);
      setMessage("New photo uploaded. Save player to apply it.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Player photo upload failed.");
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
      setMessage(`Uploaded ${result.imported} players. Existing player numbers were updated.`);
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
    let playerId = "";
    const basePool = availablePlayers.filter((player) => player.id !== currentPlayer?.id);
    const candidates = appliedSelectionCategory ? basePool.filter((player) => player.category === appliedSelectionCategory) : basePool;
    if (!candidates.length) {
      setError("No other players are available for that selection.");
      return;
    }
    if (appliedSelectionMode === "sequence") {
      const nextCandidate = [...candidates].sort((a, b) => a.player_number - b.player_number)[0];
      if (!nextCandidate) {
        setError("No player is available in sequence order.");
        return;
      }
      playerId = nextCandidate.id;
    } else {
      playerId = candidates[Math.floor(Math.random() * candidates.length)].id;
    }
    if (playerId === currentPlayer?.id) {
      setError("That player is already on the auction block.");
      return;
    }
    await action({ action: "select_player", playerId });
  }

  function applyQueueSettings() {
    setAppliedSelectionMode(selectionMode);
    setAppliedSelectionCategory(selectionCategory);
    setError("");
    setMessage("Player queue settings applied.");
  }

  async function reauctionUnsoldPlayers() {
    const succeeded = await action({ action: "reauction_unsold" });
    if (succeeded) {
      setMessage("All unsold players are available again.");
    }
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

  async function applyTeamRTM(team: Team) {
    if (!data || !pendingRTMPlayer || pendingRTMPlayer.status !== "sold" || !pendingRTMPlayer.sold_team_id) return;
    const soldPlayer = pendingRTMPlayer;
    const category = data.categories.find((item) => item.id === soldPlayer.category_id);
    const reserve = reserveForTeam(team, soldPlayer.category_id);
    const rtmBoost = (team.rtm_count ?? 0) * (category?.base_price ?? data.tournament.base_price);
    const maxBid = Math.max(0, Number(team.points_remaining) - reserve + rtmBoost);
    if ((team.rtm_count ?? 0) <= 0 || team.id === soldPlayer.sold_team_id ||
        categoryLimitReached(team, soldPlayer.category_id) || Number(soldPlayer.sold_price ?? 0) > maxBid) {
      setError(`${team.name} is not eligible for RTM.`);
      return;
    }
    const succeeded = await action({ action: "rtm", playerId: soldPlayer.id, teamId: team.id });
    if (succeeded) {
      setPendingRTMPlayer(null);
      setMessage(`${team.name} applied RTM for ${soldPlayer.full_name}.`);
    }
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
    if (categoryLimitReached(team)) {
      setError(`${team.name} has reached the maximum player count for ${currentCategory?.name ?? "this category"}.`);
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
      if (body.action === "correct_bid") {
        setBidDraft(null);
        await load();
      }
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
          <Link href={`/auction/${slug}/overlay`} target="_blank" className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-800">YouTube overlay ↗</Link>
        </nav>
        {(error || message) && <p role={error ? "alert" : "status"} className={`mt-5 rounded-lg px-4 py-3 text-sm font-semibold ${error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>{error || message}</p>}

        {view === "setup" && <>
        <nav aria-label="Tournament setup sections" className="mt-6 flex flex-wrap gap-2">
          {([
            ["overview", "Overview"],
            ["rules", "Categories & Rules"],
            ["teams", "Teams"],
            ["players", "Players"],
            ["branding", "Branding"],
            ["sponsors", "Sponsors"],
          ] as const).map(([tab, label]) => <button key={tab} type="button" onClick={() => setSetupTab(tab)} aria-current={setupTab === tab ? "page" : undefined} className={`rounded-lg border px-4 py-2 text-sm font-bold ${setupTab === tab ? "border-orange-300 bg-orange-50 text-orange-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{label}</button>)}
        </nav>

        {setupTab === "overview" && <>
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Teams", data.teams.length], ["Players", data.players.length], ["Sold", soldPlayers], ["Unsold", unsoldPlayers]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div>
          ))}
        </section>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Tournament name</h2>
          <p className="mt-1 text-sm text-slate-600">Change the name shown on the viewer and projector. The public URL stays the same.</p>
          <form onSubmit={saveTournamentName} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="min-w-60 flex-1 text-xs font-bold text-slate-600">Name<input value={tournamentName} onChange={(event) => setTournamentName(event.target.value)} className={inputClass} maxLength={120} required disabled={busy} /></label>
            <button type="submit" className={buttonClass} disabled={busy}>Save name</button>
          </form>
        </section>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Auction date</h2>
          <p className="mt-1 text-sm text-slate-600">Set the date viewers will see before the auction begins.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block text-xs font-bold text-slate-600">Scheduled date<input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className={inputClass} /></label>
            <button type="button" className={buttonClass} disabled={busy} onClick={() => void action({ action: "schedule", scheduledDate: scheduledDate || null })}>Save date</button>
            <Link href={`/admin/auctions/${slug}/run`} className={buttonClass}>Open auction console →</Link>
          </div>
        </section>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">RTM enabled league</h2>
          <p className="mt-1 text-sm text-slate-600">Controls RTM visibility on viewer pages. It does not change auction rules or team RTM counts.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block text-xs font-bold text-slate-600">RTM enabled
              <select value={rtmEnabled ? "yes" : "no"} onChange={(event) => setRtmEnabled(event.target.value === "yes")} className={inputClass} disabled={busy}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <button type="button" className={buttonClass} disabled={busy} onClick={() => void action({ action: "rtm_visibility", enabled: rtmEnabled })}>Save RTM setting</button>
          </div>
        </section>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Projector theme</h2>
          <p className="mt-1 text-sm text-slate-600">Choose the live projector layout. Both themes keep tournament branding and the team summary.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block text-xs font-bold text-slate-600">Theme
              <select value={projectorTheme} onChange={(event) => setProjectorTheme(event.target.value === "spotlight" ? "spotlight" : "classic")} className={inputClass} disabled={busy}>
                <option value="classic">Theme 1 - Classic</option>
                <option value="spotlight">Theme 2 - Spotlight</option>
              </select>
            </label>
            <button type="button" className={buttonClass} disabled={busy} onClick={() => void action({ action: "projector_theme", theme: projectorTheme })}>Save projector theme</button>
          </div>
        </section>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Player Detail Fields</h2>
          <p className="mt-1 text-sm text-slate-600">Choose which details appear on the projector and viewer pages. The player name always remains visible.</p>
          <fieldset className="mt-4 flex flex-wrap gap-x-6 gap-y-3" disabled={busy}>
            <legend className="sr-only">Projector player detail fields</legend>
            {PROJECTOR_PLAYER_FIELDS.map((field) => <label key={field.id} className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={projectorFields.includes(field.id)} onChange={(event) => setProjectorFields((current) => event.target.checked ? [...current, field.id] : current.filter((id) => id !== field.id))} className="h-4 w-4 accent-orange-600" />
              {field.label}
            </label>)}
          </fieldset>
          <button type="button" className={`${buttonClass} mt-4`} disabled={busy} onClick={() => void action({ action: "projector_player_fields", fields: projectorFields })}>Save player detail fields</button>
        </section>
        </>}

        <div className={`mt-7 grid gap-6 ${setupTab === "branding" || setupTab === "rules" ? "lg:grid-cols-2" : "lg:grid-cols-1"} ${setupTab === "overview" || setupTab === "players" ? "hidden" : ""}`}>
          {setupTab === "branding" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Public page background</h2>
            <p className="mt-1 text-sm text-slate-600">Choose the background shown on the owner/viewer page and projector. For projection, use a landscape, high-resolution image.</p>
            <label className="mt-4 block text-xs font-bold text-slate-600">Background image URL<input value={backgroundUrl} onChange={(event) => setBackgroundUrl(event.target.value)} className={inputClass} placeholder="https://…" /></label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Upload background<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadLogo(event, "background")} /></label>
              <button className={buttonClass} disabled={busy} onClick={() => void action({ action: "background", backgroundUrl: backgroundUrl.trim() || null })}>Save background</button>
              {backgroundUrl && <button className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700" disabled={busy} onClick={() => { setBackgroundUrl(""); void action({ action: "background", backgroundUrl: null }); }}>Remove background</button>}
            </div>
            {backgroundUrl && <AuctionImage src={backgroundUrl} alt="Selected auction background preview" width={640} height={200} className="mt-4 h-36 w-full rounded-lg border border-slate-200 object-cover" />}
          </section>}
          {setupTab === "branding" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Projector branding</h2>
            <p className="mt-1 text-sm text-slate-600">The projector rotates organizer logos on the left and sponsor logos on the right, with the tournament logo in the center.</p>
            <label className="mt-4 block text-xs font-bold text-slate-600">Tournament logo URL<input value={tournamentLogoUrl} onChange={(event) => setTournamentLogoUrl(event.target.value)} className={inputClass} placeholder="https://…" /></label>
            <label className="mt-3 block text-xs font-bold text-slate-600">Organizer logo URLs <span className="font-normal text-slate-500">(one per line)</span><textarea rows={3} value={organizerLogoUrls} onChange={(event) => setOrganizerLogoUrls(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-orange-500" placeholder="https://logo-one.png&#10;https://logo-two.png" /></label>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Upload tournament logo<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadLogo(event, "tournament")} /></label>
              <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Add organizer logo<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadLogo(event, "organizer")} /></label>
              <button className={buttonClass} disabled={busy} onClick={() => void action({ action: "presentation", tournamentLogoUrl: tournamentLogoUrl.trim() || null, organizerLogoUrls: organizerLogoUrls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean) })}>Save projector logos</button>
            </div>
          </section>}
          {setupTab === "rules" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Player categories</h2>
            <p className="mt-1 text-sm text-slate-600">Set each category’s opening price and per-team minimum/maximum. You can update these rules while the auction is running; minimums count toward the tournament minimum squad size.</p>
            <form onSubmit={saveCategory} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Name<input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} className={inputClass} maxLength={80} required disabled={busy} /></label>
              <label className="text-xs font-bold text-slate-600">Base price<input value={categoryForm.basePrice} onChange={(event) => setCategoryForm({ ...categoryForm, basePrice: event.target.value })} className={inputClass} type="number" min="0" step="0.01" required disabled={busy} /></label>
              <label className="text-xs font-bold text-slate-600">Min players per team<input value={categoryForm.minPlayers} onChange={(event) => setCategoryForm({ ...categoryForm, minPlayers: event.target.value })} className={inputClass} type="number" min="0" step="1" required disabled={busy} /></label>
              <label className="text-xs font-bold text-slate-600">Max players per team<input value={categoryForm.maxPlayers} onChange={(event) => setCategoryForm({ ...categoryForm, maxPlayers: event.target.value })} className={inputClass} type="number" min="1" step="1" required disabled={busy} /></label>
              <div className="flex gap-2 sm:col-span-2">
                <button disabled={busy} className={buttonClass}>{categoryForm.id ? "Save category" : "Add category"}</button>
                {categoryForm.id && <button type="button" disabled={busy} onClick={() => setCategoryForm({ id: "", name: "", basePrice: "0", minPlayers: "0", maxPlayers: String(data.tournament.max_squad_size) })} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold">Cancel edit</button>}
              </div>
            </form>
            <div className="mt-4 grid gap-2">
              {data.categories.map((category) => {
                const playerCount = data.players.filter((player) => player.category_id === category.id).length;
                return <div key={category.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
                  <div><p className="font-bold text-slate-900">{category.name}</p><p className="text-xs text-slate-600">Base {category.base_price} · Min {category.min_players} · Max {category.max_players} · {playerCount} players</p></div>
                  <div className="flex gap-2">
                    <button type="button" disabled={busy} onClick={() => editCategory(category)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">Edit</button>
                    <button type="button" disabled={busy || playerCount > 0} title={playerCount ? "Remove all players in this category first" : undefined} onClick={() => void deleteCategory(category)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Delete</button>
                  </div>
                </div>;
              })}
              {data.categories.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-600">Add categories before importing players.</p>}
            </div>
          </section>}

          {setupTab === "rules" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
          </section>}

          {setupTab === "teams" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Teams</h2>
            <form onSubmit={addTeam} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Team name<input value={teamName} onChange={(event) => setTeamName(event.target.value)} className={inputClass} maxLength={120} required /></label>
              <label className="text-xs font-bold text-slate-600">Logo image URL or upload<input value={teamLogo} onChange={(event) => setTeamLogo(event.target.value)} className={inputClass} placeholder="https://…" /></label>
              <label className="text-xs font-bold text-slate-600">RTM count<input type="number" min="0" step="1" value={teamRTM} onChange={(event) => setTeamRTM(event.target.value)} className={inputClass} /></label>
              <div className="flex items-center gap-3 sm:col-span-2">
                <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadLogo(event, "team")} /></label>
                <button disabled={busy || data.tournament.status !== "setup"} className={buttonClass}>Add team</button>
              </div>
            </form>
            <div className="mt-4 grid gap-2">{data.teams.map((team) => <div key={team.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex min-w-0 items-center gap-3"><TeamMark name={team.name} logoUrl={team.logo_url} size="sm" /><div><p className="font-bold text-slate-900">{team.name}</p><p className="text-xs text-slate-500">{team.points_remaining} pts remaining</p></div></div><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => setEditingTeam({ id: team.id, name: team.name, logo_url: team.logo_url, rtm_count: team.rtm_count ?? 0 })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">Edit team</button><button type="button" disabled={busy || data.tournament.status !== "setup"} onClick={() => void deleteTeam(team)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Delete</button></div></div>)}</div>
            {data.tournament.status !== "setup" && <p className="mt-3 text-xs text-slate-500">Team names and logos remain editable after the auction begins. Adding or deleting teams is available before it starts.</p>}
          </section>}

          {setupTab === "players" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Player pool</h2>
            <p className="mt-1 text-sm text-slate-600">Download the template, fill in one player per row, then upload the completed workbook. Name and Category are required; Player Number is optional and defaults to the row number.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={downloadPlayerTemplate}>Download Excel template</button>
              <label className={`inline-flex cursor-pointer items-center ${buttonClass} ${busy || data.tournament.status !== "setup" ? "cursor-not-allowed opacity-50" : ""}`}>{busy ? "Working…" : "Upload player list (Excel)"}<input type="file" accept=".xlsx,.xls" disabled={busy || data.tournament.status !== "setup"} className="sr-only" onChange={(event) => void importPlayers(event)} /></label>
            </div>
            <p className="mt-3 text-xs text-slate-500">{data.tournament.status === "setup" ? "Player imports are available before the auction starts; matching player numbers are updated." : "Player imports are locked after the auction starts."} Player records are shown publicly without contact or identity details.</p>
            {error && <p className="mt-2 text-sm font-semibold text-red-700">Upload error: {error}</p>}
            <p className="mt-2 text-sm font-semibold text-slate-700">{availablePlayers.length} available · {soldPlayers} sold · {unsoldPlayers} unsold</p>
          </section>}

          {setupTab === "sponsors" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Sponsors</h2>
            <p className="mt-1 text-sm text-slate-600">Use the arrows to change the order shown on the viewer and projector.</p>
            <form onSubmit={addSponsor} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Sponsor name<input value={sponsorName} onChange={(event) => setSponsorName(event.target.value)} className={inputClass} maxLength={120} required /></label>
              <label className="text-xs font-bold text-slate-600">Sponsor title (optional)<input value={sponsorTitle} onChange={(event) => setSponsorTitle(event.target.value)} className={inputClass} maxLength={120} placeholder="Title Partner, Beverage Partner…" /></label>
              <label className="text-xs font-bold text-slate-600">Logo image URL or upload<input value={sponsorLogo} onChange={(event) => setSponsorLogo(event.target.value)} className={inputClass} placeholder="https://…" /></label>
              <label className="text-xs font-bold text-slate-600">Website URL<input value={sponsorWebsite} onChange={(event) => setSponsorWebsite(event.target.value)} className={inputClass} placeholder="https://…" /></label>
              <div className="flex items-end gap-3">
                <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadLogo(event, "sponsor")} /></label>
                <button disabled={busy} className={buttonClass}>Add sponsor</button>
              </div>
            </form>
            <div className="mt-4 grid gap-2">{data.sponsors.map((sponsor, index) => <div key={sponsor.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"><div className="flex min-w-0 items-center gap-2">{sponsor.logo_url && <AuctionImage src={sponsor.logo_url} alt="" width={32} height={32} className="h-8 w-8 object-contain" />}<span>{sponsor.sponsor_title ? `${sponsor.sponsor_title} · ` : ""}{sponsor.name}</span></div><div className="flex gap-2"><button type="button" aria-label={`Move ${sponsor.name} up`} disabled={busy || index === 0} onClick={() => void moveSponsor(index, -1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">↑</button><button type="button" aria-label={`Move ${sponsor.name} down`} disabled={busy || index === data.sponsors.length - 1} onClick={() => void moveSponsor(index, 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">↓</button><button type="button" disabled={busy} onClick={() => setEditingSponsor({ ...sponsor })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">Edit</button><button type="button" disabled={busy} onClick={() => setPendingDeleteSponsor(sponsor)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Delete</button></div></div>)}</div>
          </section>}
        </div>
        {setupTab === "players" && <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5"><h2 className="font-black text-slate-900">Players · individual editing</h2><p className="mt-1 text-sm text-slate-600">Edit player details without re-importing the spreadsheet.</p></div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-3">#</th><th className="p-3">Player</th><th className="p-3">Category</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
              <tbody>{data.players.map((player) => <tr key={player.id} className="border-t border-slate-100"><td className="p-3 font-bold">{player.player_number}</td><td className="p-3 font-semibold">{player.full_name}</td><td className="p-3">{player.category}</td><td className="p-3 capitalize">{player.status}</td><td className="p-3"><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => setEditingPlayer({ id: player.id, player_number: player.player_number, full_name: player.full_name, category: player.category, role: player.role, batting_style: player.batting_style, bowling_style: player.bowling_style, previous_team: player.previous_team, photo_url: player.photo_url })} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold hover:bg-slate-50 disabled:opacity-50">Edit player</button>{data.tournament.status === "setup" && <button type="button" disabled={busy} onClick={() => setPendingDeletePlayer(player)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Delete</button>}</div></td></tr>)}</tbody>
            </table>
          </div>
        </section>}
        </>}

        {view === "run" && <section className="mt-7 overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 text-white shadow-2xl sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Auction control room</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Run the auction</h2>
              <p className="mt-2 text-sm text-slate-300">Host controls · public pages update live</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-xl border border-white/15 bg-white/5 p-1" aria-label="Auction mode">
                <button type="button" disabled={busy || data.tournament.auction_mode === "trial"} onClick={() => void changeAuctionMode("trial")} className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${data.tournament.auction_mode === "trial" ? "bg-orange-500 text-white shadow" : "text-slate-200 hover:bg-white/10"}`}>Trial Mode</button>
                <button type="button" disabled={busy || data.tournament.auction_mode === "live"} onClick={() => void changeAuctionMode("live")} className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${data.tournament.auction_mode === "live" ? "bg-emerald-500 text-white shadow" : "text-slate-200 hover:bg-white/10"}`}>Live</button>
              </div>
              <button type="button" className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50" disabled={busy || pendingBids > 0} onClick={() => { setResetPin(""); setResetDialogOpen(true); }}>Reset</button>
              {data.tournament.status === "setup" && <button className={`${buttonClass} rounded-xl px-5`} disabled={busy} onClick={() => void action({ action: "start" })}>Start auction</button>}
              {data.tournament.status !== "completed" && data.tournament.status !== "setup" && <button className="rounded-xl border border-red-300/50 px-4 py-2.5 text-sm font-bold text-red-200 hover:bg-red-400/10 disabled:opacity-50" disabled={busy} onClick={() => void action({ action: "complete" })}>Complete auction</button>}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Available", availablePlayers.length, "text-sky-300"], ["Sold", soldPlayers, "text-emerald-300"], ["Unsold", unsoldPlayers, "text-rose-300"], ["Teams", data.teams.length, "text-orange-300"]].map(([label, count, color]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className={`mt-1 text-2xl font-black ${color}`}>{count}</p></div>)}
          </div>

          {data.tournament.status === "live" && (
            <>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Player queue</p>
                    <h3 className="mt-1 text-lg font-extrabold text-white">Choose who goes on the block</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={`min-h-11 rounded-xl border px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${queueSettingsDirty ? "border-orange-300 bg-orange-400/10 text-orange-200 hover:bg-orange-400/20" : "border-white/10 bg-white/5 text-slate-400"}`} disabled={busy || !queueSettingsDirty} onClick={applyQueueSettings}>{queueSettingsDirty ? "Apply changes" : "Applied"}</button>
                    {!currentPlayer && (availablePlayers.length === 0 ? <span className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-slate-300">No available players</span> : <button type="button" className={`${buttonClass} min-h-11 rounded-xl px-5`} disabled={busy || pendingBids > 0 || queueSettingsDirty || !canSelectNextPlayer} onClick={() => void selectPlayer()}>Select 1st Player<span className="ml-2" aria-hidden="true">→</span></button>)}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-300">Selection method<select value={selectionMode} onChange={(event) => setSelectionMode(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-slate-950 px-3 text-sm font-normal text-white outline-none focus:border-orange-500"><option value="random">Random player</option><option value="sequence">Player number order</option></select></label>
                  <label className="text-xs font-bold text-slate-300">Category filter<select value={selectionCategory} onChange={(event) => setSelectionCategory(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-slate-950 px-3 text-sm font-normal text-white outline-none focus:border-orange-500"><option value="">All categories</option>{playerCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">{queueSettingsDirty ? "Queue settings changed. Click Apply changes before selecting the next player." : appliedSelectionMode === "random" ? "A random available player is selected." : "Selects the lowest-numbered available player."} {currentPlayer?.status === "available" && "Calling another player replaces the current player without recording a result."}</p>
                  <button type="button" className="rounded-xl border border-orange-300/30 bg-orange-400/10 px-4 py-2.5 text-sm font-bold text-orange-200 transition hover:bg-orange-400/20 disabled:cursor-not-allowed disabled:opacity-40" disabled={busy || unsoldPlayers === 0} onClick={() => void reauctionUnsoldPlayers()}>Re-auction unsold <span className="ml-1 rounded-full bg-orange-300/20 px-2 py-0.5 text-xs">{unsoldPlayers}</span></button>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div><p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">On the block</p><h3 className="mt-1 text-lg font-extrabold text-white">Current player & bidding</h3></div>
                  {currentPlayer && <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${currentPlayer.status === "available" ? "bg-emerald-400/15 text-emerald-300" : currentPlayer.status === "sold" ? "bg-sky-400/15 text-sky-300" : "bg-rose-400/15 text-rose-300"}`}>{currentPlayer.status === "available" ? "Bidding open" : currentPlayer.status}</span>}
                </div>
                {currentPlayer ? <>
                  <div className="relative flex min-h-28 items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-white/10 to-white/5 p-4 sm:p-5">
                    {currentPlayer.status !== "available" && <AuctionResultTag status={currentPlayer.rtm_team_id ? "rtm" : currentPlayer.status} />}
                    {currentPlayer.photo_url ? <AuctionImage src={currentPlayer.photo_url} alt="" width={88} height={88} className="h-20 w-20 shrink-0 rounded-2xl border border-white/10 object-cover sm:h-24 sm:w-24" /> : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-orange-400/15 text-2xl font-black text-orange-200 sm:h-24 sm:w-24">{currentPlayer.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>}
                    <div className="min-w-0"><p className="text-xs font-black uppercase tracking-wider text-orange-300">#{currentPlayer.player_number} <span className="mx-1 text-white/30">·</span> {currentPlayer.category}</p><p className="mt-1 truncate text-2xl font-black tracking-tight text-white sm:text-3xl">{currentPlayer.full_name}</p><p className="mt-1 text-sm text-slate-300">{currentPlayer.role || "Player"}{currentPlayer.previous_team ? ` · ${currentPlayer.previous_team}` : ""}</p></div>
                  </div>
                  {currentPlayer.status === "sold" ? <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <p className="text-3xl font-black text-white">{currentPlayer.sold_price ?? 0} <span className="text-sm text-slate-400">points</span></p>
                      <p className="mt-1 text-sm text-slate-300">Sold to {soldTeam?.name ?? "team"}.</p>
                    </div>
                    <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-2.5 text-sm font-black text-amber-200 hover:bg-amber-300/20 disabled:opacity-50" onClick={() => setPendingRTMPlayer(currentPlayer)}>RTM</button><button type="button" disabled={busy} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50" onClick={() => void action({ action: "select_player", playerId: currentPlayer.id })}>Re-Auction</button><button type="button" disabled={busy || pendingBids > 0 || queueSettingsDirty || !canSelectNextPlayer} className="rounded-xl border border-yellow-300 bg-yellow-400 px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void selectPlayer()}>Next Player <span aria-hidden="true">→</span></button></div>
                  </div> : currentPlayer.status === "unsold" ? <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className={buttonClass + " rounded-xl"} disabled={busy || queueSettingsDirty || !canSelectNextPlayer} onClick={() => void selectPlayer()}>Next player</button>
                    <button type="button" disabled={busy} className="rounded-xl border border-orange-300/30 bg-orange-300/10 px-4 py-2.5 text-sm font-black text-orange-200 hover:bg-orange-300/20 disabled:opacity-50" onClick={() => void reauctionUnsoldPlayers()}>Re-auction all unsold</button>
                  </div> : <>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{currentTeam ? `Highest bid · ${currentTeam.name}` : "Opening price"}</p><p className="mt-1 text-4xl font-black tracking-tight text-orange-300 sm:text-5xl">{data.tournament.current_bid ?? currentBasePrice}<span className="ml-2 text-sm font-bold text-slate-400">pts</span></p></div><div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bid increment</p><p className="mt-1 text-lg font-black text-white">{incrementForBid(data.tournament, data.tournament.current_bid ?? currentBasePrice)} pts</p></div></div>
                    <label className="mt-4 block text-xs font-bold text-slate-300">Set bid amount<div className="mt-1 flex max-w-md overflow-hidden rounded-xl border border-white/15 bg-white text-slate-900 shadow-inner"><button type="button" aria-label="Decrease bid" onClick={() => adjustBid("down")} disabled={Number(bidAmount) <= minimumSelectableBid} className="w-12 border-r border-slate-200 text-xl font-black text-slate-700 disabled:opacity-40">−</button><input aria-label="Bid amount" value={bidAmount} onChange={(event) => setBidDraft({ key: bidDraftKey, value: event.target.value })} onKeyDown={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); adjustBid(event.key === "ArrowUp" ? "up" : "down"); } }} type="number" min={minimumSelectableBid} step="any" className="bid-amount h-12 min-w-0 flex-1 px-3 text-lg font-black outline-none" /><button type="button" aria-label="Increase bid" onClick={() => adjustBid("up")} className="w-12 border-l border-slate-200 text-xl font-black text-slate-700">+</button></div></label>
                    {data.tournament.current_bid != null && <p className="mt-2 text-xs text-slate-400">To correct the bid, enter a lower amount and select the team. Higher bids follow the configured increment.</p>}
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Choose a team to place the bid{pendingBids > 0 ? " · Updating" : ""}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{data.teams.map((team) => {
                        const maxBid = maximumBidForTeam(team);
                        const overBudget = Number(bidAmount) > maxBid;
                        const atCategoryLimit = categoryLimitReached(team);
                        return <button key={team.id} type="button" disabled={busy || pendingBids > 0 || Number(bidAmount) < minimumSelectableBid || overBudget || atCategoryLimit} title={atCategoryLimit ? `Maximum ${currentCategory?.max_players ?? 0} players in this category` : `Maximum bid ${maxBid} · reserve ${reserveForTeam(team)}`} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition hover:border-orange-300/50 hover:bg-orange-400/10 disabled:cursor-not-allowed disabled:opacity-40 sm:p-3" onClick={() => void placeTeamBid(team)}><TeamMark name={team.name} logoUrl={team.logo_url} size="sm" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-black text-white">{team.name}</span><span className="mt-0.5 block text-[10px] font-semibold text-slate-400">{atCategoryLimit ? "Category full" : `Balance ${team.points_remaining} · Max ${maxBid}`}</span></span></button>;
                      })}</div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <button type="button" disabled={busy || pendingBids > 0 || !data.tournament.current_bid_team_id} className="min-h-12 rounded-xl border border-green-300 bg-green-600 px-4 py-2.5 text-base font-extrabold text-white shadow-sm transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void action({ action: "finalize", result: "sold" })}>✓ Sold</button>
                      <button type="button" disabled={busy || pendingBids > 0} className="min-h-12 rounded-xl border border-red-300 bg-red-600 px-4 py-2.5 text-base font-extrabold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void action({ action: "finalize", result: "unsold" })}>Unsold</button>
                      <button type="button" disabled={busy || pendingBids > 0 || queueSettingsDirty || !canSelectNextPlayer} className="min-h-12 rounded-xl border border-yellow-300 bg-yellow-400 px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void selectPlayer()}>Next Player <span aria-hidden="true">→</span></button>
                    </div>
                  </>}
                </> : <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-orange-400/10 text-2xl text-orange-300">↑</div><p className="mt-3 text-base font-bold text-white">Waiting for the next player</p><p className="mt-1 text-sm text-slate-400">Use the player queue above to call someone to the block.</p></div></div>}
              </div>
            </>
          )}
        </section>}

        {view === "run" && <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
            <div><h2 className="font-black text-slate-900">Player pool status</h2>{data.tournament.status !== "setup" && <p className="mt-1 text-xs text-slate-500">Player imports are available before the auction starts.</p>}</div>
            <label className={`inline-flex cursor-pointer items-center ${buttonClass} ${busy || data.tournament.status !== "setup" ? "cursor-not-allowed opacity-50" : ""}`}>{busy ? "Working…" : "Upload player list (Excel)"}<input type="file" accept=".xlsx,.xls" disabled={busy || data.tournament.status !== "setup"} className="sr-only" onChange={(event) => void importPlayers(event)} /></label>
          </div>
          <div className="border-b border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Filter</label>
                <select value={playerPoolSearchMode} onChange={(event) => setPlayerPoolSearchMode(event.target.value as "name" | "number")} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700">
                  <option value="name">Search by Name</option>
                  <option value="number">Search by Player Number</option>
                </select>
                <input
                  value={playerPoolFilter}
                  onChange={(event) => setPlayerPoolFilter(event.target.value)}
                  placeholder={playerPoolSearchMode === "name" ? "Search player name…" : "Search player number…"}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{filteredPlayerPool.length} results</p>
            </div>
          </div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-3">#</th><th className="p-3">Player</th><th className="p-3">Category</th><th className="p-3">Status</th><th className="p-3">Team</th><th className="p-3">Sold for</th><th className="p-3">Actions</th></tr></thead>
              <tbody>{filteredPlayerPool.map((player) => <tr key={player.id} className={`border-t border-slate-100 ${currentPlayer?.id === player.id ? "bg-orange-50" : ""}`}><td className="p-3 font-bold">{player.player_number}</td><td className="p-3 font-semibold">{player.full_name}</td><td className="p-3">{player.category}</td><td className="p-3 capitalize">{player.status}</td><td className="p-3">{data.teams.find((team) => team.id === player.sold_team_id)?.name ?? "—"}</td><td className="p-3">{player.sold_price ?? "—"}</td><td className="flex gap-2 p-3"><button type="button" disabled={busy || data.tournament.status !== "live" || currentPlayer?.id === player.id} onClick={() => void selectPlayerFromTable(player)} className="rounded-lg border border-orange-200 px-2 py-1 text-xs font-bold text-orange-800 disabled:opacity-50">{currentPlayer?.id === player.id ? "On block" : player.status === "available" ? "Call player" : "Re-auction"}</button><button type="button" disabled={busy} onClick={() => setEditingPlayer({ id: player.id, player_number: player.player_number, full_name: player.full_name, category: player.category, role: player.role, batting_style: player.batting_style, bowling_style: player.bowling_style, previous_team: player.previous_team, photo_url: player.photo_url })} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold disabled:opacity-50">Edit</button></td></tr>)}</tbody>
            </table>
          </div>
        </section>}
        {editingTeam && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 p-4">
          <form onSubmit={saveTeam} className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-orange-700">Team settings</p><h2 className="mt-1 text-xl font-black text-slate-950">Update team</h2></div><button type="button" onClick={() => setEditingTeam(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold">Close</button></div>
            <label className="mt-5 block text-xs font-bold text-slate-600">Team name<input value={editingTeam.name} onChange={(event) => setEditingTeam({ ...editingTeam, name: event.target.value })} className={inputClass} maxLength={120} required /></label>
            <label className="mt-3 block text-xs font-bold text-slate-600">Team logo URL<input value={editingTeam.logo_url ?? ""} onChange={(event) => setEditingTeam({ ...editingTeam, logo_url: event.target.value || null })} className={inputClass} placeholder="https://…" /></label>
            <label className="mt-3 block text-xs font-bold text-slate-600">RTM count<input type="number" min="0" step="1" value={editingTeam.rtm_count ?? 0} onChange={(event) => setEditingTeam({ ...editingTeam, rtm_count: Number(event.target.value) || 0 })} className={inputClass} /></label>
            <div className="mt-3 flex items-center gap-3"><label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="sr-only" onChange={(event) => void uploadEditedTeamLogo(event)} /></label><TeamMark name={editingTeam.name} logoUrl={editingTeam.logo_url} size="sm" /></div>
            <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setEditingTeam(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={busy} className={buttonClass}>{busy ? "Saving…" : "Save team"}</button></div>
          </form>
        </div>}
        {editingSponsor && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 p-4">
          <form onSubmit={saveSponsor} className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-orange-700">Sponsor settings</p><h2 className="mt-1 text-xl font-black text-slate-950">Update sponsor</h2></div><button type="button" onClick={() => setEditingSponsor(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold">Close</button></div>
            <label className="mt-5 block text-xs font-bold text-slate-600">Sponsor name<input value={editingSponsor.name} onChange={(event) => setEditingSponsor({ ...editingSponsor, name: event.target.value })} className={inputClass} maxLength={120} required /></label>
            <label className="mt-3 block text-xs font-bold text-slate-600">Sponsor title (optional)<input value={editingSponsor.sponsor_title ?? ""} onChange={(event) => setEditingSponsor({ ...editingSponsor, sponsor_title: event.target.value || null })} className={inputClass} maxLength={120} placeholder="Title Partner, Beverage Partner…" /></label>
            <label className="mt-3 block text-xs font-bold text-slate-600">Logo image URL<input value={editingSponsor.logo_url ?? ""} onChange={(event) => setEditingSponsor({ ...editingSponsor, logo_url: event.target.value || null })} className={inputClass} placeholder="https://…" /></label>
            <label className="mt-3 block text-xs font-bold text-slate-600">Website URL<input value={editingSponsor.website_url ?? ""} onChange={(event) => setEditingSponsor({ ...editingSponsor, website_url: event.target.value || null })} className={inputClass} placeholder="https://…" /></label>
            <div className="mt-3 flex items-center gap-3"><label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="sr-only" onChange={(event) => void uploadEditedSponsorLogo(event)} /></label>{editingSponsor.logo_url && <AuctionImage src={editingSponsor.logo_url} alt="Sponsor logo preview" width={32} height={32} className="h-8 w-8 object-contain" />}</div>
            <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setEditingSponsor(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={busy} className={buttonClass}>{busy ? "Saving…" : "Save sponsor"}</button></div>
          </form>
        </div>}
        {pendingRTMPlayer && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setPendingRTMPlayer(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="rtm-title" className="w-full max-w-xl animate-in zoom-in-95 rounded-2xl border border-white/70 bg-white p-6 shadow-2xl duration-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-amber-700">RTM</p>
                <h2 id="rtm-title" className="mt-1 text-xl font-black text-slate-950">Choose a team for {pendingRTMPlayer.full_name}</h2>
              </div>
              <button type="button" disabled={busy} onClick={() => setPendingRTMPlayer(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">Close</button>
            </div>
            <p className="mt-2 text-sm text-slate-600">Only teams that still have RTM available and can afford the current price are enabled.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {data.teams.filter((team) => team.id !== pendingRTMPlayer.sold_team_id).map((team) => {
                const rtmCategory = data.categories.find((category) => category.id === pendingRTMPlayer.category_id);
                const reserve = reserveForTeam(team, pendingRTMPlayer.category_id);
                const maximumBid = Math.max(0, Number(team.points_remaining) - reserve + (team.rtm_count ?? 0) * (rtmCategory?.base_price ?? data.tournament.base_price));
                const isEligible = (team.rtm_count ?? 0) > 0 && !categoryLimitReached(team, pendingRTMPlayer.category_id) && Number(pendingRTMPlayer.sold_price ?? 0) <= maximumBid;
                return <button key={team.id} type="button" disabled={busy || !isEligible} onClick={() => void applyTeamRTM(team)} className={`rounded-xl border p-3 text-left transition ${isEligible ? "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400" : "border-slate-200 bg-slate-100 text-slate-400 opacity-60"}`}>
                  <div className="flex items-center justify-between gap-3"><span className="font-bold">{team.name}</span>{(team.rtm_count ?? 0) > 0 ? <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">RTM x{team.rtm_count}</span> : <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Exhausted</span>}</div>
                  <p className="mt-2 text-xs">Max bid: {maximumBid}</p>
                  <p className="text-xs">Balance: {team.points_remaining} pts</p>
                </button>;
              })}
            </div>
            {data.teams.filter((team) => team.id !== pendingRTMPlayer.sold_team_id).length === 0 && <p className="mt-5 text-sm text-slate-600">There are no other teams in this tournament.</p>}
          </section>
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
        {pendingDeletePlayer && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setPendingDeletePlayer(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="delete-player-title" className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-wider text-red-700">Player settings</p>
            <h2 id="delete-player-title" className="mt-1 text-xl font-black text-slate-950">Delete {pendingDeletePlayer.full_name}?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">This permanently removes player #{pendingDeletePlayer.player_number} from this tournament. Players can only be deleted before the auction starts.</p>
            <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setPendingDeletePlayer(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button><button type="button" disabled={busy} onClick={() => void confirmDeletePlayer()} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-50">{busy ? "Deleting…" : "Delete player"}</button></div>
          </section>
        </div>}
        {resetDialogOpen && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="reset-auction-title" className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-wider text-red-700">Auction reset</p>
            <h2 id="reset-auction-title" className="mt-1 text-xl font-black text-slate-950">Reset this auction?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">All players will return to available, team budgets and used RTMs will be restored, and the auction will return to setup. Teams, players, categories, and sponsors will be kept.</p>
            {data.tournament.auction_mode === "live" && <label className="mt-4 block text-xs font-bold text-slate-600">Admin password<input type="password" autoComplete="current-password" value={resetPin} onChange={(event) => setResetPin(event.target.value)} className={inputClass} required /></label>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={busy} onClick={() => setResetDialogOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button>
              <button type="button" disabled={busy || (data.tournament.auction_mode === "live" && !resetPin)} onClick={() => void confirmAuctionReset()} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-50">{busy ? "Resetting…" : "Reset auction"}</button>
            </div>
          </section>
        </div>}
        {pendingMode && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="mode-change-title" className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-wider text-orange-700">Auction mode</p>
            <h2 id="mode-change-title" className="mt-1 text-xl font-black text-slate-950">Switch to {pendingMode === "live" ? "Live" : "Trial Mode"}?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Enter the admin password to confirm this mode change.</p>
            <label className="mt-4 block text-xs font-bold text-slate-600">Admin password<input type="password" autoComplete="current-password" value={modePin} onChange={(event) => setModePin(event.target.value)} className={inputClass} required /></label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={busy} onClick={() => { setPendingMode(null); setModePin(""); }} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button>
              <button type="button" disabled={busy || !modePin} onClick={() => void confirmAuctionModeChange()} className={buttonClass}>{busy ? "Saving…" : "Switch mode"}</button>
            </div>
          </section>
        </div>}
        {editingPlayer && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 p-4">
          <form onSubmit={savePlayer} className="my-auto max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-orange-700">Player editor</p><h2 className="mt-1 text-xl font-black text-slate-950">{editingPlayer.full_name}</h2></div><button type="button" onClick={() => setEditingPlayer(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold">Close</button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Player number<input type="number" min={1} value={editingPlayer.player_number} onChange={(event) => updateEditingPlayer("player_number", Number(event.target.value))} className={inputClass} required /></label>
              <label className="text-xs font-bold text-slate-600">Full name<input value={editingPlayer.full_name} onChange={(event) => updateEditingPlayer("full_name", event.target.value)} className={inputClass} maxLength={160} required /></label>
              <label className="text-xs font-bold text-slate-600">Category<select value={editingPlayer.category} onChange={(event) => updateEditingPlayer("category", event.target.value)} className={inputClass} required disabled={busy}>{data.categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-600">Role<input value={editingPlayer.role ?? ""} onChange={(event) => updateEditingPlayer("role", event.target.value || null)} className={inputClass} maxLength={100} /></label>
              <label className="text-xs font-bold text-slate-600">Batting style<input value={editingPlayer.batting_style ?? ""} onChange={(event) => updateEditingPlayer("batting_style", event.target.value || null)} className={inputClass} maxLength={100} /></label>
              <label className="text-xs font-bold text-slate-600">Bowling style<input value={editingPlayer.bowling_style ?? ""} onChange={(event) => updateEditingPlayer("bowling_style", event.target.value || null)} className={inputClass} maxLength={100} /></label>
              <label className="text-xs font-bold text-slate-600">Previous team<input value={editingPlayer.previous_team ?? ""} onChange={(event) => updateEditingPlayer("previous_team", event.target.value || null)} className={inputClass} maxLength={120} /></label>
              <label className="text-xs font-bold text-slate-600">Player photo URL<input value={editingPlayer.photo_url ?? ""} onChange={(event) => updateEditingPlayer("photo_url", event.target.value || null)} className={inputClass} /></label>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                {editingPlayer.photo_url && <AuctionImage src={editingPlayer.photo_url} alt={`${editingPlayer.full_name} photo preview`} width={64} height={64} className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />}
                <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Upload replacement photo<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="sr-only" onChange={(event) => void uploadEditedPlayerPhoto(event)} /></label>
                <p className="text-xs text-slate-500">JPG, PNG, or WebP up to 10 MB. The uploaded photo replaces the current one when you save.</p>
              </div>
            </div>
            {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
            <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setEditingPlayer(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={busy} className={buttonClass}>{busy ? "Saving…" : "Save player"}</button></div>
          </form>
        </div>}
      </div>
    </main>
  );
}
