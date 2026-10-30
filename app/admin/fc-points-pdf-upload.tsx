"use client";

import { useEffect, useState } from "react";

type Team = { team_id: string; team_name: string };
type Row = { team_id: string; position: number; matches_played: number; won: number; lost: number; drawn: number; tied: number; no_result: number; points: number; net_run_rate: number; runs_for: string; runs_against: string; last_five: string };
const blank = (team_id = "", position = 1): Row => ({ team_id, position, matches_played: 0, won: 0, lost: 0, drawn: 0, tied: 0, no_result: 0, points: 0, net_run_rate: 0, runs_for: "", runs_against: "", last_five: "" });

function prefillRows(ocr: string, teams: Team[], current: Row[]) {
  return current.map((row) => {
    const team = teams.find((item) => item.team_id === row.team_id);
    if (!team) return row;
    const line = ocr.split(/\r?\n/).find((item) => item.toLowerCase().includes(team.team_name.toLowerCase()));
    if (!line) return row;
    const nameAt = line.toLowerCase().indexOf(team.team_name.toLowerCase());
    const before = line.slice(0, nameAt).match(/\d+/)?.[0];
    const values = line.slice(nameAt + team.team_name.length);
    const nrr = values.match(/[-+]?\d+\.\d+/)?.[0];
    if (!nrr) return row;
    const beforeNrr = values.slice(0, values.indexOf(nrr)).match(/\d+/g)?.map(Number) ?? [];
    const scores = values.match(/\d+\/\d+(?:\.\d+)?/g) ?? [];
    const afterScores = scores.length >= 2 ? values.slice(values.lastIndexOf(scores[1]) + scores[1].length) : "";
    const points = afterScores.match(/\d+/)?.[0];
    const lastFive = afterScores.trim().split(/\s+/).find((token) => /^[WL-]{2,}$/i.test(token)) ?? "";
    return {
      ...row,
      position: before ? Number(before) : row.position,
      matches_played: beforeNrr[0] ?? row.matches_played,
      won: beforeNrr[1] ?? row.won,
      lost: beforeNrr[2] ?? row.lost,
      drawn: beforeNrr[3] ?? 0,
      tied: beforeNrr[4] ?? 0,
      no_result: beforeNrr[5] ?? 0,
      net_run_rate: Number(nrr), runs_for: scores[0] ?? "", runs_against: scores[1] ?? "",
      points: points ? Number(points) : row.points, last_five: lastFive.toUpperCase(),
    };
  });
}

export default function FcPointsPdfUpload() {
  const [teams, setTeams] = useState<Team[]>([]); const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false); const [ocr, setOcr] = useState("");
  useEffect(() => { void fetch("/api/points-table/pdf").then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); setTeams(data.teams); setRows(data.teams.map((team: Team, index: number) => blank(team.team_id, index + 1))); }).catch(e => setStatus(e instanceof Error ? e.message : "Could not load teams.")); }, []);
  const update = (index: number, key: keyof Row, value: string) => setRows(current => current.map((row, i) => i === index ? { ...row, [key]: key === "team_id" || key === "runs_for" || key === "runs_against" || key === "last_five" ? value : Number(value) } : row));
  async function readPdf(file: File) {
    setBusy(true); setStatus("Reading the upload and recognizing the standings…"); setOcr("");
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const page = await pdf.getPage(1); const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d"); if (!context) throw new Error("Could not prepare the PDF image.");
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const { data } = await (await import("tesseract.js")).recognize(canvas, "eng");
      setOcr(data.text); setRows(current => prefillRows(data.text, teams, current)); setStatus("OCR complete. The review table was filled from the PDF—check each value, then save.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not read this PDF."); }
    finally { setBusy(false); }
  }
  async function save() { setBusy(true); setStatus(""); try { const response = await fetch("/api/points-table/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setStatus("Updated all 8 teams from the reviewed PDF."); } catch (error) { setStatus(error instanceof Error ? error.message : "Could not save standings."); } finally { setBusy(false); } }
  return <div className="rounded-2xl bg-white p-6 shadow-sm"><h3 className="text-lg font-black text-slate-900">Upload Points Table PDF</h3><p className="mt-2 text-sm leading-6 text-slate-500">Upload the CricHeroes points-table PDF, then review the extracted values before publishing.</p><label className="mt-5 block text-sm font-bold text-slate-700">CricHeroes PDF<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void readPdf(file); }} className="mt-2 block w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>{ocr && <details className="mt-4 rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-bold text-slate-700">OCR text (use this to fill the review table)</summary><pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-600">{ocr}</pre></details>}<div className="mt-5 overflow-x-auto"><table className="min-w-[900px] text-xs"><thead><tr className="text-left text-slate-500">{["Team","Pos","M","W","L","D","T","NR","Pts","NRR","For","Against","Last 5"].map(h => <th className="px-1 py-2" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} className="border-t border-slate-100">{(["team_id","position","matches_played","won","lost","drawn","tied","no_result","points","net_run_rate","runs_for","runs_against","last_five"] as (keyof Row)[]).map(key => <td key={key} className="p-1">{key === "team_id" ? <select value={row.team_id} onChange={e => update(i, key, e.target.value)} className="w-40 rounded border border-slate-200 p-2"><option value="">Choose team</option>{teams.map(team => <option key={team.team_id} value={team.team_id}>{team.team_name}</option>)}</select> : <input value={row[key]} onChange={e => update(i, key, e.target.value)} className="w-16 rounded border border-slate-200 p-2" />}</td>)}</tr>)}</tbody></table></div><button type="button" disabled={busy || rows.length !== 8} onClick={() => void save()} className="mt-5 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50">{busy ? "Processing…" : "Save Reviewed Points Table"}</button>{status && <p role="status" className="mt-3 text-sm text-slate-600">{status}</p>}</div>;
}
