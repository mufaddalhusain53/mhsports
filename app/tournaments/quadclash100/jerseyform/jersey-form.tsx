"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { jerseyOptions, jerseySizes, jerseyTeams } from "@/lib/jersey-options";

const fieldClass = "mt-2 h-12 w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3 font-normal outline-none transition focus:border-fuchsia-500 focus:bg-white focus:ring-2 focus:ring-fuchsia-100";

type Payment = {
  status: "free" | "pending" | "paid" | "not_collected";
  amount: number;
  manual?: boolean;
  message?: string;
};

function PaymentQr() {
  return <>
    <Image src="/quadclash100/jersey-payment-qr.jpg?v=2" alt="PhonePe payment QR code" width={838} height={702} unoptimized className="h-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white" />
    <a href="/quadclash100/jersey-payment-qr.jpg?v=2" download className="block text-sm font-bold text-fuchsia-800 underline">Download QR code</a>
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
    return <section className="mt-6 rounded-3xl border border-fuchsia-100 bg-white p-5 shadow-lg shadow-slate-900/5 sm:p-8">
      <p className="mb-2 text-xs font-black uppercase tracking-widest text-fuchsia-700">Jersey registration</p>
      <h2 className="text-xl font-black text-slate-900">{formEnabled === false ? "Jersey form closed" : "Jersey form unavailable"}</h2>
      <p className="mt-3 text-slate-600">{formEnabled === false ? "New jersey requests are currently closed." : message || "Checking jersey form status..."}</p>
    </section>;
  }

  const selected = jerseyOptions.find((item) => item.value === option);
  return <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 sm:p-8">
    <p className="text-xs font-black uppercase tracking-widest text-fuchsia-700">Season 2 kit</p>
    <h2 className="mt-1 text-2xl font-black">Jersey Charge Details</h2>
    <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
      <li className="rounded-xl bg-fuchsia-50 px-4 py-3 font-semibold">Half Sleeves jersey will be provided.</li>
      <li className="rounded-xl bg-slate-50 px-4 py-3 font-semibold">Full Sleeves - ₹150</li>
      <li className="rounded-xl bg-slate-50 px-4 py-3 font-semibold">Extra Half Sleeves - ₹500</li>
      <li className="rounded-xl bg-slate-50 px-4 py-3 font-semibold">Extra Full Sleeves - ₹650</li>
    </ul>
    <p className="mt-4 text-sm leading-6 text-slate-600">Paid options require QR payment and organizer verification before the request is confirmed.</p>
    {requestId && <div className="mt-5 space-y-3 rounded-2xl border border-fuchsia-100 bg-fuchsia-50 p-4" aria-live="polite">
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
        <button type="button" disabled={busy} onClick={() => void loadPayment(requestId)} className="rounded-xl border border-fuchsia-500 px-4 py-2 text-sm font-bold text-fuchsia-800 disabled:opacity-50">{busy ? "Checking..." : "Check payment status"}</button>
      </>}
      {payment && payment.status !== "pending" && formEnabled === true && <button type="button" onClick={() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("request");
        window.history.replaceState(null, "", url);
        setRequestId(null);
        setPayment(null);
        setOption("");
      }} className="block rounded-xl border border-fuchsia-500 px-4 py-2 text-sm font-bold text-fuchsia-800">Submit another request</button>}
    </div>}
    {message && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{message}</p>}
    <form key={requestId ?? "new"} onSubmit={submit} className="mt-6 space-y-5">
      <fieldset disabled={busy || !!requestId || formEnabled !== true} className="space-y-5 disabled:opacity-60">
      <div className="border-t border-slate-100 pt-6">
        <h3 className="text-xl font-black text-slate-900">Your jersey details</h3>
        <p className="mt-1 text-sm text-slate-600">All fields are required.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-bold text-slate-700">Player Name<input name="player_name" required maxLength={100} className={fieldClass} /></label>
        <label className="block text-sm font-bold text-slate-700">Name on Jersey<input name="jersey_name" required maxLength={100} className={fieldClass} /></label>
        <label className="block text-sm font-bold text-slate-700">Selected Team<select name="team" required defaultValue="" className={fieldClass}><option value="" disabled>Select team</option>{jerseyTeams.map((team) => <option key={team}>{team}</option>)}</select></label>
        <label className="block text-sm font-bold text-slate-700">Jersey Size<select name="jersey_size" required defaultValue="" className={fieldClass}><option value="" disabled>Select size</option>{jerseySizes.map((size) => <option key={size}>{size}</option>)}</select></label>
        <label className="block text-sm font-bold text-slate-700">Opt for Jersey Modification<select name="jersey_option" required value={option} onChange={(event) => setOption(event.target.value)} className={fieldClass}><option value="" disabled>Select jersey option</option>{jerseyOptions.map((item) => <option key={item.value} value={item.value}>{item.value} — ₹{item.price}</option>)}</select></label>
      </div>
      {selected && <p className="rounded-xl border border-fuchsia-100 bg-fuchsia-50 p-4 font-bold text-fuchsia-900">Amount payable: ₹{selected.price}</p>}
      {selected && selected.price > 0 && !requestId && <div className="space-y-3">
        <p className="text-sm text-slate-700">Submit your jersey details first, then pay ₹{selected.price} using this QR code.</p>
        <PaymentQr />
      </div>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-indigo-700 to-fuchsia-700 px-6 py-3.5 font-black text-white shadow-md transition hover:from-indigo-800 hover:to-fuchsia-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-700 disabled:opacity-50 sm:w-auto">{busy ? "Saving..." : "Submit Jersey Details"}</button>
      </fieldset>
    </form>
  </section>;
}
