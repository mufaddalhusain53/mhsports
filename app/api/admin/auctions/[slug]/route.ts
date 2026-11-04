import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Context = { params: Promise<{ slug: string }> };
type AuctionAction =
  | { action: "rules"; pointsPerTeam: number; basePrice: number; bidIncrement: number; bidIncrementRules: { from: number; increment: number }[]; minSquadSize: number; maxSquadSize: number }
  | { action: "add_team"; name: string; logoUrl?: string; rtmCount?: number }
  | { action: "edit_team"; teamId: string; name: string; logoUrl: string | null; rtmCount?: number }
  | { action: "rtm"; playerId: string; teamId: string }
  | { action: "delete_team"; teamId: string }
  | { action: "add_sponsor"; name: string; logoUrl?: string; websiteUrl?: string }
  | { action: "edit_sponsor"; sponsorId: string; name: string; logoUrl: string | null; websiteUrl: string | null }
  | { action: "delete_sponsor"; sponsorId: string }
  | { action: "background"; backgroundUrl: string | null }
  | { action: "presentation"; tournamentLogoUrl: string | null; organizerLogoUrls: string[] }
  | { action: "start" | "pause" | "resume" | "complete" | "reauction_unsold" }
  | { action: "select_player"; playerId: string }
  | { action: "bid"; teamId: string; amount: number }
  | { action: "correct_bid"; teamId: string; amount: number }
  | { action: "finalize"; result: "sold" | "unsold" };

function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isValidUrl(value: unknown) {
  if (value === undefined || value === null || value === "") return true;
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(_request: Request, { params }: Context) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const { slug } = await params;
  const { data: tournament, error: tournamentError } = await supabaseAdmin
    .from("auction_tournaments").select("*").eq("slug", slug).maybeSingle();
  if (tournamentError) {
    return NextResponse.json({ error: `Unable to load tournament: ${tournamentError.message}` }, { status: 500 });
  }
  if (!tournament) return NextResponse.json({ error: "Auction tournament not found." }, { status: 404 });

  const [teamsResult, playersResult, sponsorsResult] = await Promise.all([
    supabaseAdmin.from("auction_teams").select("*").eq("tournament_id", tournament.id).order("name"),
    supabaseAdmin.from("auction_players").select("*").eq("tournament_id", tournament.id).order("player_number"),
    supabaseAdmin.from("auction_sponsors").select("*").eq("tournament_id", tournament.id).order("display_order").order("name"),
  ]);
  const failure = teamsResult.error ?? playersResult.error ?? sponsorsResult.error;
  if (failure) return NextResponse.json({ error: `Unable to load auction data: ${failure.message}` }, { status: 500 });
  return NextResponse.json(
    { tournament, teams: teamsResult.data ?? [], players: playersResult.data ?? [], sponsors: sponsorsResult.data ?? [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(request: Request, { params }: Context) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const { slug } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof (body as { action?: unknown }).action !== "string") {
    return NextResponse.json({ error: "A valid auction action is required." }, { status: 400 });
  }
  const action = body as AuctionAction;

  if (action.action === "bid") {
    if (typeof action.teamId !== "string" || typeof action.amount !== "number" || !Number.isFinite(action.amount)) {
      return NextResponse.json({ error: "Choose a team and a valid bid amount." }, { status: 400 });
    }
    const { error } = await supabaseAdmin.rpc("auction_record_bid", {
      p_slug: slug, p_team_id: action.teamId, p_amount: action.amount,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }
  if (action.action === "select_player") {
    if (typeof action.playerId !== "string") return NextResponse.json({ error: "Choose a valid player." }, { status: 400 });

    const { data: player, error: playerLookupError } = await supabaseAdmin
      .from("auction_players")
      .select("id,status,sold_team_id,sold_price,rtm_team_id")
      .eq("id", action.playerId)
      .maybeSingle();
    if (playerLookupError) return NextResponse.json({ error: playerLookupError.message }, { status: 500 });

    if (player && player.status === "sold" && player.rtm_team_id) {
      const { data: team, error: teamLookupError } = await supabaseAdmin
        .from("auction_teams")
        .select("id,rtm_count")
        .eq("id", player.rtm_team_id)
        .maybeSingle();
      if (teamLookupError) return NextResponse.json({ error: teamLookupError.message }, { status: 500 });
      if (team) {
        const { error: restoreRtmError } = await supabaseAdmin
          .from("auction_teams")
          .update({ rtm_count: Number(team.rtm_count ?? 0) + 1 })
          .eq("id", team.id);
        if (restoreRtmError) return NextResponse.json({ error: `Unable to restore RTM balance: ${restoreRtmError.message}` }, { status: 500 });
      }
      const { error: clearRtmError } = await supabaseAdmin
        .from("auction_players")
        .update({ rtm_team_id: null })
        .eq("id", player.id);
      if (clearRtmError) return NextResponse.json({ error: `Unable to clear RTM state: ${clearRtmError.message}` }, { status: 500 });
    }

    const { error } = await supabaseAdmin.rpc("auction_select_player", { p_slug: slug, p_player_id: action.playerId });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }
  if (action.action === "finalize") {
    if (action.result !== "sold" && action.result !== "unsold") return NextResponse.json({ error: "Choose sold or unsold." }, { status: 400 });
    const { error } = await supabaseAdmin.rpc("auction_finalize_player", { p_slug: slug, p_result: action.result });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }
  if (action.action === "reauction_unsold") {
    const { data: tournamentData, error: tournamentLookupError } = await supabaseAdmin
      .from("auction_tournaments")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (tournamentLookupError) return NextResponse.json({ error: tournamentLookupError.message }, { status: 500 });
    if (!tournamentData) return NextResponse.json({ error: "Auction tournament not found." }, { status: 404 });
    const { error } = await supabaseAdmin
      .from("auction_players")
      .update({ status: "available", sold_team_id: null, sold_price: null, rtm_team_id: null })
      .eq("tournament_id", tournamentData.id)
      .eq("status", "unsold");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }
  const { data: tournament, error: lookupError } = await supabaseAdmin
    .from("auction_tournaments").select("*").eq("slug", slug).maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!tournament) return NextResponse.json({ error: "Auction tournament not found." }, { status: 404 });

  let errorMessage: string | null = null;
  if (action.action === "rtm") {
    if (typeof action.playerId !== "string" || !action.playerId || typeof action.teamId !== "string" || !action.teamId) {
      return NextResponse.json({ error: "Choose a valid player and team." }, { status: 400 });
    }

    const { data: player, error: playerError } = await supabaseAdmin
      .from("auction_players")
      .select("id,status,sold_team_id,sold_price,tournament_id")
      .eq("id", action.playerId)
      .eq("tournament_id", tournament.id)
      .maybeSingle();
    if (playerError) return NextResponse.json({ error: playerError.message }, { status: 500 });
    if (!player) return NextResponse.json({ error: "Player not found in this tournament." }, { status: 404 });
    if (player.status !== "sold" || !player.sold_team_id) return NextResponse.json({ error: "This player is not currently sold." }, { status: 409 });

    const { data: currentOwner, error: ownerError } = await supabaseAdmin
      .from("auction_teams")
      .select("id,points_remaining")
      .eq("id", player.sold_team_id)
      .eq("tournament_id", tournament.id)
      .maybeSingle();
    if (ownerError) return NextResponse.json({ error: ownerError.message }, { status: 500 });
    if (!currentOwner) return NextResponse.json({ error: "The current owner team was not found." }, { status: 404 });

    const { data: targetTeam, error: targetError } = await supabaseAdmin
      .from("auction_teams")
      .select("id,points_remaining,rtm_count")
      .eq("id", action.teamId)
      .eq("tournament_id", tournament.id)
      .maybeSingle();
    if (targetError) return NextResponse.json({ error: targetError.message }, { status: 500 });
    if (!targetTeam) return NextResponse.json({ error: "Target team not found in this tournament." }, { status: 404 });
    if (targetTeam.id === currentOwner.id) return NextResponse.json({ error: "RTM can only be used by a different team." }, { status: 409 });

    const soldPrice = Number(player.sold_price ?? 0);
    const remainingRtms = Number(targetTeam.rtm_count ?? 0);
    if (remainingRtms <= 0) return NextResponse.json({ error: "This team has exhausted its RTM count." }, { status: 409 });

    const { count: targetSoldCount, error: targetCountError } = await supabaseAdmin
      .from("auction_players")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournament.id)
      .eq("sold_team_id", targetTeam.id)
      .eq("status", "sold");
    if (targetCountError) return NextResponse.json({ error: targetCountError.message }, { status: 500 });

    const reserve = Math.max(tournament.min_squad_size - (targetSoldCount ?? 0) - 1, 0) * tournament.base_price;
    const teamMaxBid = Math.max(0, Number(targetTeam.points_remaining) - reserve + (remainingRtms * tournament.base_price));
    if (soldPrice > teamMaxBid) return NextResponse.json({ error: "This team does not have enough remaining balance or RTM allowance for the current price." }, { status: 409 });

    const { error } = await supabaseAdmin
      .from("auction_teams")
      .update({
        points_remaining: Number(targetTeam.points_remaining) - soldPrice,
        rtm_count: remainingRtms - 1,
      })
      .eq("id", targetTeam.id)
      .eq("tournament_id", tournament.id);
    if (error) return NextResponse.json({ error: `Unable to apply RTM: ${error.message}` }, { status: 500 });

    const { error: restoreError } = await supabaseAdmin
      .from("auction_teams")
      .update({
        points_remaining: Number(currentOwner.points_remaining) + soldPrice,
      })
      .eq("id", currentOwner.id)
      .eq("tournament_id", tournament.id);
    if (restoreError) return NextResponse.json({ error: `Unable to restore the original team's balance: ${restoreError.message}` }, { status: 500 });

    const { error: playerUpdateError } = await supabaseAdmin
      .from("auction_players")
      .update({ status: "sold", sold_team_id: targetTeam.id, sold_price: soldPrice, rtm_team_id: targetTeam.id })
      .eq("id", player.id)
      .eq("tournament_id", tournament.id);
    if (playerUpdateError) return NextResponse.json({ error: `Unable to transfer the sold player: ${playerUpdateError.message}` }, { status: 500 });

    return NextResponse.json({ success: true });
  }

  switch (action.action) {
    case "correct_bid": {
      if (typeof action.teamId !== "string" || typeof action.amount !== "number" || !Number.isFinite(action.amount)) {
        return NextResponse.json({ error: "Choose a team and a valid corrected bid amount." }, { status: 400 });
      }
      if (tournament.status !== "live" || !tournament.current_player_id) return NextResponse.json({ error: "A live player is required to correct a bid." }, { status: 409 });
      if (action.amount < tournament.base_price || Math.round(action.amount * 100) !== action.amount * 100) {
        return NextResponse.json({ error: `The corrected bid must be at least ${tournament.base_price} points.` }, { status: 400 });
      }
      const [{ data: player, error: playerError }, { data: team, error: teamError }] = await Promise.all([
        supabaseAdmin.from("auction_players").select("status").eq("id", tournament.current_player_id).maybeSingle(),
        supabaseAdmin.from("auction_teams").select("id,points_remaining,rtm_count").eq("id", action.teamId).eq("tournament_id", tournament.id).maybeSingle(),
      ]);
      if (playerError || teamError) return NextResponse.json({ error: (playerError ?? teamError)?.message }, { status: 500 });
      if (!player || player.status !== "available") return NextResponse.json({ error: "The current player is no longer accepting bids." }, { status: 409 });
      if (!team) return NextResponse.json({ error: "Team does not belong to this tournament." }, { status: 404 });
      const { count, error: countError } = await supabaseAdmin.from("auction_players").select("id", { count: "exact", head: true }).eq("tournament_id", tournament.id).eq("sold_team_id", action.teamId).eq("status", "sold");
      if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
      const reserve = Math.max(tournament.min_squad_size - (count ?? 0) - 1, 0) * tournament.base_price;
      const rtmBoost = Number(team.rtm_count ?? 0) * tournament.base_price;
      const maxCorrectedBid = Number(team.points_remaining) - reserve + rtmBoost;
      if (action.amount > maxCorrectedBid) return NextResponse.json({ error: `This team can bid up to ${maxCorrectedBid} points after its reserve.` }, { status: 409 });
      const { error } = await supabaseAdmin.from("auction_tournaments").update({ current_bid: action.amount, current_bid_team_id: action.teamId, updated_at: new Date().toISOString() }).eq("id", tournament.id);
      if (error) return NextResponse.json({ error: `Unable to correct bid: ${error.message}` }, { status: 500 });
      break;
    }
    case "rules": {
      const values = [action.pointsPerTeam, action.basePrice, action.bidIncrement, action.minSquadSize, action.maxSquadSize];
      const hasExtraDecimals = [action.pointsPerTeam, action.basePrice, action.bidIncrement]
        .some((value) => typeof value === "number" && Math.abs(value * 100 - Math.round(value * 100)) > 1e-8);
      const incrementRules = Array.isArray(action.bidIncrementRules) ? action.bidIncrementRules : [];
      const validIncrementRules = incrementRules.length > 0 && incrementRules.length <= 20 && incrementRules.every((rule, index) =>
        rule && typeof rule.from === "number" && Number.isFinite(rule.from) && rule.from >= 0 &&
        typeof rule.increment === "number" && Number.isFinite(rule.increment) && rule.increment > 0 &&
        (index === 0 ? rule.from === 0 : rule.from > incrementRules[index - 1].from)
      );
      if (values.some((value) => typeof value !== "number" || !Number.isFinite(value)) || !validIncrementRules ||
          hasExtraDecimals ||
          action.pointsPerTeam < 0 || action.basePrice < 0 || action.basePrice > action.pointsPerTeam || action.bidIncrement <= 0 ||
          !Number.isInteger(action.minSquadSize) || action.minSquadSize < 0 ||
          !Number.isInteger(action.maxSquadSize) || action.maxSquadSize < 1 ||
          action.minSquadSize > action.maxSquadSize) {
        return NextResponse.json({ error: "Enter valid points, bid increment, and squad-size limits." }, { status: 400 });
      }
      {
        const { error } = await supabaseAdmin.from("auction_tournaments").update({
          points_per_team: action.pointsPerTeam, base_price: action.basePrice, bid_increment: action.bidIncrement,
          bid_increment_rules: incrementRules,
          min_squad_size: action.minSquadSize, max_squad_size: action.maxSquadSize, updated_at: new Date().toISOString(),
        }).eq("id", tournament.id);
        if (error) return NextResponse.json({ error: `Unable to save rules: ${error.message}` }, { status: 500 });
        const { data: teams, error: teamsError } = await supabaseAdmin.from("auction_teams")
          .select("id,points_remaining").eq("tournament_id", tournament.id);
        if (teamsError) return NextResponse.json({ error: `Rules saved, but team budgets could not be loaded: ${teamsError.message}` }, { status: 500 });
        const budgetDifference = action.pointsPerTeam - Number(tournament.points_per_team);
        const updates = await Promise.all((teams ?? []).map((team) => supabaseAdmin.from("auction_teams")
          .update({ points_remaining: Number(team.points_remaining) + budgetDifference })
          .eq("id", team.id)));
        const teamError = updates.find((result) => result.error)?.error;
        if (teamError) return NextResponse.json({ error: `Rules saved, but team budgets could not be updated: ${teamError.message}` }, { status: 500 });
      }
      break;
    }
    case "add_team": {
      const name = typeof action.name === "string" ? action.name.trim() : "";
      const teamSlug = slugify(name);
      const rtmCount = Number.isFinite(action.rtmCount) ? Math.max(0, Math.floor(Number(action.rtmCount))) : 0;
      if (!name || name.length > 120 || !teamSlug || !isValidUrl(action.logoUrl) || rtmCount < 0) {
        return NextResponse.json({ error: "Enter a team name, a valid logo URL, and a non-negative RTM count." }, { status: 400 });
      }
      if (tournament.status !== "setup") return NextResponse.json({ error: "Teams can only be added before the auction starts." }, { status: 409 });
      const { error } = await supabaseAdmin.from("auction_teams").insert({
        tournament_id: tournament.id, name, slug: teamSlug, logo_url: action.logoUrl || null, rtm_count: rtmCount,
        points_remaining: tournament.points_per_team,
      });
      if (error) return NextResponse.json({ error: error.code === "23505" ? "A team with this name already exists." : `Unable to add team: ${error.message}` }, { status: error.code === "23505" ? 409 : 500 });
      break;
    }
    case "edit_team": {
      const name = typeof action.name === "string" ? action.name.trim() : "";
      const teamSlug = slugify(name);
      const rtmCount = Number.isFinite(action.rtmCount) ? Math.max(0, Math.floor(Number(action.rtmCount))) : 0;
      if (typeof action.teamId !== "string" || !action.teamId || !name || name.length > 120 || !teamSlug || !isValidUrl(action.logoUrl) || rtmCount < 0) {
        return NextResponse.json({ error: "Enter a team name, a valid logo URL, and a non-negative RTM count." }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin.from("auction_teams")
        .update({ name, slug: teamSlug, logo_url: action.logoUrl ?? null, rtm_count: rtmCount })
        .eq("id", action.teamId)
        .eq("tournament_id", tournament.id)
        .select("id")
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.code === "23505" ? "A team with this name already exists." : `Unable to update team: ${error.message}` }, { status: error.code === "23505" ? 409 : 500 });
      if (!data) return NextResponse.json({ error: "Team not found in this tournament." }, { status: 404 });
      break;
    }
    case "delete_team": {
      if (typeof action.teamId !== "string" || !action.teamId) return NextResponse.json({ error: "Choose a team to delete." }, { status: 400 });
      if (tournament.status !== "setup") return NextResponse.json({ error: "Teams can only be deleted before the auction starts." }, { status: 409 });
      const { count, error: playerError } = await supabaseAdmin.from("auction_players")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", tournament.id)
        .eq("sold_team_id", action.teamId);
      if (playerError) return NextResponse.json({ error: playerError.message }, { status: 500 });
      if (count) return NextResponse.json({ error: "This team has auction results and cannot be deleted." }, { status: 409 });
      const { data, error } = await supabaseAdmin.from("auction_teams")
        .delete()
        .eq("id", action.teamId)
        .eq("tournament_id", tournament.id)
        .select("id")
        .maybeSingle();
      if (error) return NextResponse.json({ error: `Unable to delete team: ${error.message}` }, { status: 500 });
      if (!data) return NextResponse.json({ error: "Team not found in this tournament." }, { status: 404 });
      break;
    }
    case "add_sponsor": {
      const name = typeof action.name === "string" ? action.name.trim() : "";
      if (!name || name.length > 120 || !isValidUrl(action.logoUrl) || !isValidUrl(action.websiteUrl)) {
        return NextResponse.json({ error: "Enter a sponsor name and valid image/website URLs." }, { status: 400 });
      }
      const { error } = await supabaseAdmin.from("auction_sponsors").insert({
        tournament_id: tournament.id, name, logo_url: action.logoUrl || null, website_url: action.websiteUrl || null,
      });
      if (error) return NextResponse.json({ error: `Unable to add sponsor: ${error.message}` }, { status: 500 });
      break;
    }
    case "edit_sponsor": {
      const name = typeof action.name === "string" ? action.name.trim() : "";
      if (typeof action.sponsorId !== "string" || !action.sponsorId || !name || name.length > 120 || !isValidUrl(action.logoUrl) || !isValidUrl(action.websiteUrl)) {
        return NextResponse.json({ error: "Enter a sponsor name and valid image/website URLs." }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin.from("auction_sponsors")
        .update({ name, logo_url: action.logoUrl ?? null, website_url: action.websiteUrl ?? null })
        .eq("id", action.sponsorId)
        .eq("tournament_id", tournament.id)
        .select("id")
        .maybeSingle();
      if (error) return NextResponse.json({ error: `Unable to update sponsor: ${error.message}` }, { status: 500 });
      if (!data) return NextResponse.json({ error: "Sponsor not found in this tournament." }, { status: 404 });
      break;
    }
    case "delete_sponsor": {
      if (typeof action.sponsorId !== "string" || !action.sponsorId) return NextResponse.json({ error: "Choose a sponsor to delete." }, { status: 400 });
      const { data, error } = await supabaseAdmin.from("auction_sponsors")
        .delete()
        .eq("id", action.sponsorId)
        .eq("tournament_id", tournament.id)
        .select("id")
        .maybeSingle();
      if (error) return NextResponse.json({ error: `Unable to delete sponsor: ${error.message}` }, { status: 500 });
      if (!data) return NextResponse.json({ error: "Sponsor not found in this tournament." }, { status: 404 });
      break;
    }
    case "background": {
      if (action.backgroundUrl !== null && !isValidUrl(action.backgroundUrl)) {
        return NextResponse.json({ error: "Enter a valid background image URL." }, { status: 400 });
      }
      const { error } = await supabaseAdmin.from("auction_tournaments")
        .update({ background_url: action.backgroundUrl, updated_at: new Date().toISOString() })
        .eq("id", tournament.id);
      if (error) return NextResponse.json({ error: `Unable to save the auction background: ${error.message}` }, { status: 500 });
      break;
    }
    case "presentation": {
      if ((action.tournamentLogoUrl !== null && !isValidUrl(action.tournamentLogoUrl)) ||
          !Array.isArray(action.organizerLogoUrls) ||
          action.organizerLogoUrls.length > 20 ||
          action.organizerLogoUrls.some((url) => !isValidUrl(url) || typeof url !== "string")) {
        return NextResponse.json({ error: "Add valid image URLs for the tournament and organizers." }, { status: 400 });
      }
      const { error } = await supabaseAdmin.from("auction_tournaments")
        .update({
          tournament_logo_url: action.tournamentLogoUrl,
          organizer_logo_urls: action.organizerLogoUrls,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tournament.id);
      if (error) return NextResponse.json({ error: `Unable to save projector logos: ${error.message}` }, { status: 500 });
      break;
    }
    case "start":
    case "resume": {
      if (!["setup", "paused"].includes(tournament.status)) {
        return NextResponse.json({ error: "Only a setup or paused auction can be started." }, { status: 409 });
      }
      const [{ count: teamCount, error: teamsError }, { count: playerCount, error: playersError }] = await Promise.all([
        supabaseAdmin.from("auction_teams").select("id", { count: "exact", head: true }).eq("tournament_id", tournament.id),
        supabaseAdmin.from("auction_players").select("id", { count: "exact", head: true }).eq("tournament_id", tournament.id),
      ]);
      if (teamsError || playersError) return NextResponse.json({ error: (teamsError ?? playersError)?.message }, { status: 500 });
      if (!teamCount || teamCount < 2) return NextResponse.json({ error: "Add at least two teams before starting." }, { status: 409 });
      if (!playerCount) return NextResponse.json({ error: "Import player data before starting." }, { status: 409 });
      {
        const { error } = await supabaseAdmin.from("auction_tournaments").update({ status: "live", updated_at: new Date().toISOString() }).eq("id", tournament.id);
        if (error) errorMessage = error.message;
      }
      break;
    }
    case "pause":
    case "complete": {
      if (tournament.status !== "live" && tournament.status !== "paused") {
        return NextResponse.json({ error: "Only a live or paused auction can be paused or completed." }, { status: 409 });
      }
      if (tournament.current_player_id && action.action === "complete") {
        const { data: currentPlayer, error: playerError } = await supabaseAdmin
          .from("auction_players").select("status").eq("id", tournament.current_player_id).maybeSingle();
        if (playerError) return NextResponse.json({ error: playerError.message }, { status: 500 });
        if (currentPlayer?.status === "available") {
          return NextResponse.json({ error: "Finish the current player before completing the auction." }, { status: 409 });
        }
      }
      const nextStatus = action.action === "pause" ? "paused" : "completed";
      const { error } = await supabaseAdmin.from("auction_tournaments")
        .update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", tournament.id);
      if (error) errorMessage = error.message;
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown auction action." }, { status: 400 });
  }
  if (errorMessage) return NextResponse.json({ error: errorMessage }, { status: 409 });
  return NextResponse.json({ success: true });
}
