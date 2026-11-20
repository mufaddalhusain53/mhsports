"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { jerseyOptions, jerseySizes, jerseyTeams } from "@/lib/jersey-options";

const fieldClass = "mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

type Payment = {
  status: "free" | "pending" | "paid" | "not_collected";
  amount: number;
  manual?: boolean;
  message?: string;
};

function PaymentQr() {
  return <>
    <Image src="/quadclash100/jersey-payment-qr.jpg?v=2" alt="PhonePe payment QR code" width={838} height={702} unoptimized className="h-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white" />
    <a href="/quadclash100/jersey-payment-qr.jpg?v=2" download className="block text-sm font-bold text-orange-700 underline">Download QR code</a>
  </>;
}

export default function JerseyForm() {
  const submissionId = useRef<string | null>(null);
  const [option, setOption] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [formEnabled, setFormEnabled] = useState<boolean | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);

  async function loadPayment(id: string) {
    setBusy(true);
    setMessage("");
    setPayment(null);
    try {
      const response = await fetch(`/api/quadclash100-jersey/payment?request=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPayment(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not check the payment. Please try again.");
    } finally { setBusy(false); }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/quadclash100-jersey", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active) setFormEnabled(data.enabled);
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : "Could not check the jersey form status.");
      })
      .finally(() => {
        const id = new URL(window.location.href).searchParams.get("request");
        if (active && id) {
          setRequestId(id);
          void loadPayment(id);
        }
      });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = submissionId.current ?? crypto.randomUUID();
    submissionId.current = id;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/quadclash100-jersey", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, player_name: form.get("player_name"), jersey_name: form.get("jersey_name"), team: form.get("team"), jersey_size: form.get("jersey_size"), jersey_option: form.get("jersey_option") }),
      });
      const result = await response.json();
      if (response.status === 403) {
        setFormEnabled(false);
        setMessage(result.error);
        return;
      }
      if (!response.ok) throw new Error(result.error);
      submissionId.current = null;
      setRequestId(id);
      const url = new URL(window.location.href);
      url.searchParams.set("request", id);
      window.history.replaceState(null, "", url);
      setPayment({ status: result.status, amount: result.amount, manual: result.amount > 0 });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit the form. Please try again.");
    } finally { setBusy(false); }
  }

  if (formEnabled !== true && !requestId) {
    return <section className="mt-6 rounded-2xl border border-orange-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-black text-slate-900">{formEnabled === false ? "Jersey form closed" : "Jersey form unavailable"}</h2>
      <p className="mt-3 text-slate-600">{formEnabled === false ? "New jersey requests are currently closed." : message || "Checking jersey form status..."}</p>
    </section>;
  }

  const selected = jerseyOptions.find((item) => item.value === option);
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <h2 className="text-2xl font-black">Jersey Charge Details</h2>
    <ul className="mt-2 space-y-1 text-sm text-slate-600">
      <li>Half Sleeves jersey will be provided.</li>
      <li>Full Sleeves - ₹150</li>
      <li>Extra Half Sleeves - ₹500</li>
      <li>Extra Full Sleeves - ₹650</li>
    </ul>
    <p className="mt-1 text-sm text-slate-600">Paid options require QR payment and organizer verification before the request is confirmed.</p>
    {requestId && <div className="mt-5 space-y-3 rounded-xl bg-orange-50 p-4" aria-live="polite">
      {payment?.status === "free" && <p className="font-bold text-emerald-700">Jersey details submitted successfully. No payment is required.</p>}
      {payment?.status === "paid" && <p className="font-bold text-emerald-700">Payment confirmed. Your jersey request is complete.</p>}
      {payment?.status === "not_collected" && <p className="font-bold text-slate-700">This earlier request did not collect payment online.</p>}
      {payment?.status === "pending" && <p className="font-bold text-slate-800">Payment pending: ₹{payment.amount}. Your request is not yet confirmed.</p>}
      {payment?.message && <p className="text-sm text-slate-700">{payment.message}</p>}
      {payment?.status === "pending" && payment.manual && <div className="space-y-3">
        <p className="text-sm text-slate-700">Scan the QR code and enter exactly ₹{payment.amount}. Then send the payment screenshot and the request reference below on WhatsApp.</p>
        <PaymentQr />
        <p className="break-all text-sm text-slate-700">Request reference: <strong>{requestId}</strong></p>
        <a href="https://wa.me/qr/5IDLQCQVAK66P1?s=v" target="_blank" rel="noopener noreferrer" className="inline-block rounded-xl bg-emerald-600 px-5 py-3 font-black text-white hover:bg-emerald-700">Share payment screenshot on WhatsApp</a>
        <p className="text-sm text-slate-700">The organizer will verify the payment and update your request.</p>
      </div>}
      {(!payment || payment.status === "pending") && <>
        <p className="text-sm text-slate-600">Save this page link to return and check your payment. Do not submit a second request.</p>
        <button type="button" disabled={busy} onClick={() => void loadPayment(requestId)} className="rounded-xl border border-orange-500 px-4 py-2 text-sm font-bold text-orange-700 disabled:opacity-50">{busy ? "Checking..." : "Check payment status"}</button>
      </>}
      {payment && payment.status !== "pending" && formEnabled === true && <button type="button" onClick={() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("request");
        window.history.replaceState(null, "", url);
        setRequestId(null);
        setPayment(null);
        setOption("");
      }} className="block rounded-xl border border-orange-500 px-4 py-2 text-sm font-bold text-orange-700">Submit another request</button>}
    </div>}
    {message && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{message}</p>}
    <form key={requestId ?? "new"} onSubmit={submit} className="mt-6 space-y-5">
      <fieldset disabled={busy || !!requestId || formEnabled !== true} className="space-y-5 disabled:opacity-60">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold text-slate-700">Player Name<input name="player_name" required maxLength={100} className={fieldClass} /></label>
        <label className="block text-sm font-bold text-slate-700">Name on Jersey<input name="jersey_name" required maxLength={100} className={fieldClass} /></label>
        <label className="block text-sm font-bold text-slate-700">Selected Team<select name="team" required defaultValue="" className={fieldClass}><option value="" disabled>Select team</option>{jerseyTeams.map((team) => <option key={team}>{team}</option>)}</select></label>
        <label className="block text-sm font-bold text-slate-700">Jersey Size<select name="jersey_size" required defaultValue="" className={fieldClass}><option value="" disabled>Select size</option>{jerseySizes.map((size) => <option key={size}>{size}</option>)}</select></label>
        <label className="block text-sm font-bold text-slate-700">Opt for Jersey Modification<select name="jersey_option" required value={option} onChange={(event) => setOption(event.target.value)} className={fieldClass}><option value="" disabled>Select jersey option</option>{jerseyOptions.map((item) => <option key={item.value} value={item.value}>{item.value} — ₹{item.price}</option>)}</select></label>
      </div>
      {selected && <p className="rounded-xl bg-orange-50 p-4 font-bold text-slate-800">Amount payable: ₹{selected.price}</p>}
      {selected && selected.price > 0 && !requestId && <div className="space-y-3">
        <p className="text-sm text-slate-700">Submit your jersey details first, then pay ₹{selected.price} using this QR code.</p>
        <PaymentQr />
      </div>}
      <button type="submit" disabled={busy} className="rounded-xl bg-orange-500 px-5 py-3 font-black text-white hover:bg-orange-600 disabled:opacity-50">{busy ? "Saving..." : "Submit Jersey Details"}</button>
      </fieldset>
    </form>
  </section>;
}
