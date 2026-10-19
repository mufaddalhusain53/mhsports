"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

type RegisteredPlayer = {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  age: number;
  its_id: string;
  season1_team: string;
  role: string;
  batting_style: string;
  bowling_style: string;
  photo_url: string;
  auction_available: boolean;
  created_at: string;
};

function downloadPlayerExcel(players: RegisteredPlayer[]) {
  const rows = players.map((player, index) => ({
    "#": index + 1,
    "First Name": player.first_name,
    "Last Name": player.last_name,
    "Phone Number": player.phone_number,
    Age: player.age,
    "ITS ID / Ejamat": player.its_id,
    "QC 100 Season 1 Team": player.season1_team,
    Role: player.role,
    "Batting Style": player.batting_style,
    "Bowling Style": player.bowling_style,
    "Auction Status": player.auction_available
      ? "Available for auction"
      : "Inactive — not available for auction",
    "Player Photo": player.photo_url,
    Registered: new Date(player.created_at).toLocaleString("en-IN"),
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 8 },
    { wch: 18 },
    { wch: 26 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 34 },
    { wch: 60 },
    { wch: 24 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "QC100 Players");
  XLSX.writeFile(
    workbook,
    `QC100_Player_Registrations_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export default function QuadClashRegistrationAdmin() {
  const [enabled, setEnabled] = useState(false);
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [nameSearch, setNameSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [updatingPlayerId, setUpdatingPlayerId] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const filteredPlayers = players.filter((player) =>
    `${player.first_name} ${player.last_name}`
      .toLowerCase()
      .includes(nameSearch.trim().toLowerCase())
  );
  const availablePlayers = players.filter(
    (player) => player.auction_available
  ).length;
  const unavailablePlayers = players.length - availablePlayers;

  async function fetchRegistrations() {
    const response = await fetch("/api/admin/quadclash100-registration", {
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error ?? "Unable to load registrations.");
    }
    return result as {
      enabled: boolean;
      players: RegisteredPlayer[];
    };
  }

  async function loadRegistrations() {
    try {
      const result = await fetchRegistrations();
      setStatus("");
      setEnabled(result.enabled);
      setPlayers(result.players);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to load registrations."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    fetchRegistrations()
      .then((result) => {
        if (!active) return;
        setEnabled(result.enabled);
        setPlayers(result.players);
      })
      .catch((error: unknown) => {
        if (active) {
          setStatus(
            error instanceof Error
              ? error.message
              : "Unable to load registrations."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function updateRegistrationState(nextEnabled: boolean) {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/quadclash100-registration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update registration.");
      }
      setEnabled(result.enabled);
      setStatus(
        result.enabled
          ? "Registration form is now open to players."
          : "Registration form is now closed."
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to update registration."
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateAuctionAvailability(player: RegisteredPlayer) {
    const auctionAvailable = !player.auction_available;
    setUpdatingPlayerId(player.id);
    setStatus("");
    try {
      const response = await fetch("/api/admin/quadclash100-registration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          auctionAvailable,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update player status.");
      }
      setPlayers((currentPlayers) =>
        currentPlayers.map((currentPlayer) =>
          currentPlayer.id === player.id
            ? { ...currentPlayer, auction_available: result.auctionAvailable }
            : currentPlayer
        )
      );
      setStatus(
        auctionAvailable
          ? `${player.first_name} ${player.last_name} is available for auction.`
          : `${player.first_name} ${player.last_name} marked inactive and unavailable for auction.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to update player status."
      );
    } finally {
      setUpdatingPlayerId(null);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-orange-500">
            QuadClash 100
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-900">
            Player Registration
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Keep the form private until you are ready. Player photos are stored
            with shareable public links.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void updateRegistrationState(!enabled)}
          disabled={busy || loading}
          aria-pressed={enabled}
          className={`rounded-xl px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
            enabled
              ? "bg-red-600 hover:bg-red-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {busy
            ? "Saving…"
            : enabled
              ? "Disable Registration"
              : "Enable Registration"}
        </button>
      </div>

      <div
        className={`rounded-xl p-4 text-sm font-bold ${
          enabled
            ? "bg-emerald-50 text-emerald-800"
            : "bg-slate-100 text-slate-700"
        }`}
      >
        Form status: {enabled ? "Open to players" : "Closed"}
      </div>

      {status && (
        <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          {status}
        </p>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h4 className="text-lg font-black text-slate-900">
            Registered players
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            {players.length} {players.length === 1 ? "player" : "players"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadPlayerExcel(filteredPlayers)}
            disabled={loading || filteredPlayers.length === 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ↓ Download Excel
          </button>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadRegistrations();
            }}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh list"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">
            Available for auction
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-900">
            {availablePlayers}
          </p>
        </div>
        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-sm font-semibold text-slate-700">
            Not available for auction
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {unavailablePlayers}
          </p>
        </div>
      </div>

      <label className="block max-w-lg text-sm font-bold text-slate-700">
        Search player by name
        <input
          type="search"
          value={nameSearch}
          onChange={(event) => setNameSearch(event.target.value)}
          placeholder="Enter a player name"
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />
      </label>

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Loading registrations…
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[1000px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {[
                  "#",
                  "Player",
                  "Phone",
                  "Age",
                  "ITS ID",
                  "Season 1 Team",
                  "Role",
                  "Batting",
                  "Bowling",
                  "Auction Status",
                  "Photo",
                  "Registered",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-bold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    {players.length === 0
                      ? "No players have registered yet."
                      : "No player names match your search."}
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player, index) => (
                  <tr key={player.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {player.first_name} {player.last_name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {player.phone_number}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{player.age}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {player.its_id}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {player.season1_team}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{player.role}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {player.batting_style}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {player.bowling_style}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className={`mb-2 text-xs font-bold ${
                          player.auction_available
                            ? "text-emerald-700"
                            : "text-slate-500"
                        }`}
                      >
                        {player.auction_available
                          ? "Available"
                          : "Inactive"}
                      </div>
                      <button
                        type="button"
                        onClick={() => void updateAuctionAvailability(player)}
                        disabled={updatingPlayerId === player.id}
                        className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                          player.auction_available
                            ? "bg-slate-600 hover:bg-slate-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {updatingPlayerId === player.id
                          ? "Saving…"
                          : player.auction_available
                            ? "Mark Inactive"
                            : "Mark Available"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-2">
                        <a
                          href={player.photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-orange-700 underline"
                        >
                          View photo
                        </a>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(player.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
