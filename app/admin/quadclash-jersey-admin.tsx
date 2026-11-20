"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { countJerseyTeams } from "@/lib/jersey-options";

type JerseyRequest = {
  id: string; player_name: string; jersey_name: string; phone_number: string | null; team: string; jersey_size: string;
  jersey_option: string; amount: number; payment_status: "not_collected" | "free" | "pending" | "paid";
  payment_provider: "manual_qr" | "cashfree_order" | "cashfree_link" | null; created_at: string;
};

const paymentLabels: Record<JerseyRequest["payment_status"], string> = {
  not_collected: "Not collected online",
  free: "Free",
  pending: "Payment pending",
  paid: "Paid",
};

const teamColors = ["#ea580c", "#2563eb", "#16a34a", "#9333ea", "#ca8a04", "#0891b2"];

async function fetchJerseyRequests(): Promise<{ enabled: boolean; requests: JerseyRequest[] }> {
  const response = await fetch("/api/admin/quadclash100-jersey", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not load jersey requests.");
  return data;
}

export default function QuadClashJerseyAdmin({ readOnly }: { readOnly: boolean }) {
  const [rows, setRows] = useState<JerseyRequest[]>([]);
  const [status, setStatus] = useState("Loading jersey requests...");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    let active = true;
    fetchJerseyRequests().then((data) => {
      if (active) { setRows(data.requests); setEnabled(data.enabled); setStatus(""); }
    }).catch((error: unknown) => { if (active) setStatus(error instanceof Error ? error.message : "Could not load jersey requests."); })
      .finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, []);

  async function refreshRequests() {
    setRefreshing(true);
    setStatus("");
    try {
      const data = await fetchJerseyRequests();
      setRows(data.requests);
      setEnabled(data.enabled);
      setStatus("Jersey requests refreshed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load jersey requests.");
    } finally { setRefreshing(false); }
  }

  async function updateFormStatus(nextEnabled: boolean) {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/quadclash100-jersey", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEnabled(data.enabled);
      setStatus(data.enabled ? "Jersey form is now open." : "Jersey form is now closed to new requests.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update jersey form status.");
    } finally { setBusy(false); }
  }

  async function confirmPayment(row: JerseyRequest) {
    if (!window.confirm(`Confirm that you have verified receipt of ₹${row.amount} for ${row.player_name} (${row.id})?`)) return;
    setConfirming(row.id);
    setStatus("");
    try {
      const response = await fetch("/api/admin/quadclash100-jersey", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_payment", id: row.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, payment_status: "paid" } : item));
      setStatus("Payment marked as verified.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not confirm payment.");
    } finally { setConfirming(null); }
  }

  async function deleteRequest(row: JerseyRequest) {
    if (!window.confirm(`Permanently delete the jersey request for ${row.player_name} (${row.id})? This cannot be undone and will not cancel or refund a payment.`)) return;
    setDeleting(row.id);
    setStatus("");
    try {
      const response = await fetch("/api/admin/quadclash100-jersey", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRows((current) => current.filter((item) => item.id !== row.id));
      setStatus("Jersey request deleted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not delete jersey request.");
    } finally { setDeleting(null); }
  }

  function download() {
    const data = rows.map((row) => ({
      "Request reference": row.id,
      "Player Name": row.player_name, "Name on Jersey": row.jersey_name, "Mobile Number": row.phone_number,
      Team: row.team, Size: row.jersey_size, Option: row.jersey_option, "Amount (INR)": row.amount,
      Status: paymentLabels[row.payment_status], Submitted: new Date(row.created_at).toLocaleString("en-IN"),
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data), "Jersey Requests");
    XLSX.writeFile(book, `QC100_Jersey_Requests_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const teamCounts = countJerseyTeams(rows).map((item, index) => ({ ...item, color: teamColors[index % teamColors.length] }));
  const segments = teamCounts.filter(({ count }) => count > 0).map(({ count, color }, index, teams) => {
    const start = teams.slice(0, index).reduce((total, team) => total + team.count, 0) / rows.length * 100;
    const end = start + count / rows.length * 100;
    return `${color} ${start}%, ${color} ${end}%`;
  });

  return <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black text-slate-900">Jersey Requests</h3><p className="mt-1 text-sm text-slate-600">{readOnly ? "View jersey requests and their payment statuses." : "Check the WhatsApp screenshot and verify receipt and amount before marking a QR payment as paid."}</p></div>
      {!readOnly && <button type="button" disabled={enabled === null || busy || refreshing} aria-pressed={enabled === true} onClick={() => void updateFormStatus(!enabled)} className={`rounded-xl px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
        {busy ? "Saving..." : enabled ? "Disable Jersey Form" : "Enable Jersey Form"}
      </button>}
    </div>
    {enabled !== null && <div className={`rounded-xl p-4 text-sm font-bold ${enabled ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>Jersey form status: {enabled ? "Open to players" : "Closed"}</div>}
    {status && <p role="status" className="text-sm text-slate-600">{status}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={!rows.length || refreshing} onClick={download} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Export Excel</button>
      <button type="button" disabled={refreshing || busy || confirming !== null || deleting !== null} onClick={() => void refreshRequests()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{refreshing ? "Loading…" : "Refresh list"}</button>
    </div>
    {enabled !== null && <section aria-labelledby="team-chart-title" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 id="team-chart-title" className="text-lg font-black text-slate-900">Jersey Requests by Team</h4>
      <p className="mt-1 text-sm text-slate-600">Includes all submissions, including pending payments. Each submission is counted once.</p>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div role="img" aria-label={rows.length ? `Team distribution: ${teamCounts.map(({ team, count }) => `${team}: ${count}`).join(", ")}` : "No jersey requests yet"} className="h-40 w-40 shrink-0 rounded-full border border-white shadow-sm" style={{ background: segments.length ? `conic-gradient(${segments.join(", ")})` : "#e2e8f0" }} />
        <div className="min-w-[220px] flex-1">
          <p className="mb-2 text-sm font-bold text-slate-700">Total requests: {rows.length}</p>
          <ul className="space-y-2">{teamCounts.map(({ team, count, color }) => <li key={team} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 text-slate-700"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: color }} />{team}</span>
            <strong className="text-slate-900">{count}</strong>
          </li>)}</ul>
        </div>
      </div>
    </section>}
    {enabled !== null && (rows.length === 0 ? <p className="text-sm text-slate-600">No jersey requests yet.</p> :
      <div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-left text-sm"><thead><tr>{["Reference", "Player", "Jersey name", "Team", "Size", "Option", "Amount", "Status", "Submitted", ...(!readOnly ? ["Action"] : [])].map((item) => <th className="px-2 py-3" key={item}>{item}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-slate-200">{[row.id, row.player_name, row.jersey_name, row.team, row.jersey_size, row.jersey_option, `₹${row.amount}`, paymentLabels[row.payment_status], new Date(row.created_at).toLocaleString("en-IN")].map((value, i) => <td className="px-2 py-3" key={i}>{value}</td>)}{!readOnly && <td className="px-2 py-3"><div className="flex gap-2">{row.payment_status === "pending" && row.payment_provider === "manual_qr" && <button type="button" disabled={confirming !== null || deleting !== null || refreshing} onClick={() => void confirmPayment(row)} className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white disabled:opacity-50">{confirming === row.id ? "Saving..." : "Mark paid"}</button>}<button type="button" disabled={confirming !== null || deleting !== null || refreshing} onClick={() => void deleteRequest(row)} className="whitespace-nowrap rounded-lg bg-red-600 px-3 py-2 font-bold text-white disabled:opacity-50">{deleting === row.id ? "Deleting..." : "Delete"}</button></div></td>}</tr>)}</tbody></table></div>
    )}
  </section>;
}
