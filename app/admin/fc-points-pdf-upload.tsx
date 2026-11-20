"use client";

import { useEffect, useState } from "react";
import { emptyPointsRow, extractPointsRows, pointsFields, validatePointsRows } from "@/lib/fc-points-pdf";
import type { PointsField, PointsReviewRow, PointsTeam } from "@/lib/fc-points-pdf";

const labels: Record<PointsField, string> = {
  position: "Pos", matches_played: "M", won: "W", lost: "L", drawn: "D", tied: "T",
  no_result: "NR", points: "Pts", net_run_rate: "NRR", runs_for: "For", runs_against: "Against", last_five: "Last 5",
};

export default function FcPointsPdfUpload() {
  const [teams, setTeams] = useState<PointsTeam[]>([]);
  const [rows, setRows] = useState<PointsReviewRow[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [extracted, setExtracted] = useState(false);

  useEffect(() => {
    void fetch("/api/points-table/pdf").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTeams(data.teams);
      setRows(data.teams.map((team: PointsTeam) => emptyPointsRow(team.team_id)));
    }).catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Could not load teams."));
  }, []);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  function update(index: number, field: PointsField, value: string) {
    setRows((current) => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
    setReviewed(false);
  }

  async function readPdf(file: File) {
    setBusy(true);
    setStatus("Reading the PDF. This may take a minute...");
    setReviewed(false);
    setExtracted(false);
    setRows(teams.map((team) => emptyPointsRow(team.team_id)));
    setPdfUrl(URL.createObjectURL(file));
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      try {
        const pdf = await loadingTask.promise;
        if (pdf.numPages > 10) throw new Error("Please upload a points-table PDF of 10 pages or fewer.");
        const { createWorker, PSM } = await import("tesseract.js");
        const worker = await createWorker("eng");
        try {
          const passes = ["", ""];
          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 4 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Could not prepare the PDF image.");
            await page.render({ canvas, canvasContext: context, viewport }).promise;
            for (const [index, mode] of [PSM.AUTO, PSM.SINGLE_BLOCK].entries()) {
              await worker.setParameters({ tessedit_pageseg_mode: mode });
              const { data } = await worker.recognize(canvas);
              passes[index] += `\n${data.text}`;
            }
          }
          const extractedRows = extractPointsRows(passes, teams);
          setRows(extractedRows);
          setExtracted(true);
          const blanks = extractedRows.reduce((count, row) => count + pointsFields.filter((field) => !row[field]).length, 0);
          setStatus(blanks
            ? `PDF read. ${blanks} fields could not be read consistently and are blank. Fill them in and compare every value with the PDF.`
            : "PDF read. Compare every value with the PDF before publishing; OCR can make mistakes.");
        } finally {
          await worker.terminate();
        }
      } finally {
        await loadingTask.destroy();
      }
    } catch (error) {
      console.error("Could not read the points-table PDF:", error);
      setStatus(error instanceof Error ? error.message : "Could not read this PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const validationError = validatePointsRows(rows);
    if (validationError || !reviewed || !extracted) {
      setStatus(validationError ?? "Review the uploaded PDF and confirm the values before saving.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const payload = rows.map((row) => ({
        ...row,
        position: Number(row.position), matches_played: Number(row.matches_played), won: Number(row.won),
        lost: Number(row.lost), drawn: Number(row.drawn), tied: Number(row.tied), no_result: Number(row.no_result),
        points: Number(row.points), net_run_rate: Number(row.net_run_rate),
      }));
      const response = await fetch("/api/points-table/pdf", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setReviewed(false);
      setStatus("Points table published. Refresh the public points-table page to see the update.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save standings.");
    } finally {
      setBusy(false);
    }
  }

  const validationError = extracted ? validatePointsRows(rows) : null;
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-900">Upload Points Table PDF</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">Upload the CricHeroes points-table PDF. OCR can make mistakes, so compare every value with the PDF before publishing.</p>
      <label className="mt-5 block text-sm font-bold text-slate-700">
        CricHeroes PDF
        <input type="file" accept="application/pdf,.pdf" disabled={busy || teams.length !== 8} onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void readPdf(file);
          event.target.value = "";
        }} className="mt-2 block w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
      </label>
      {status && <p role="status" className="mt-3 text-sm text-slate-700">{status}</p>}
      {pdfUrl && <details className="mt-4 rounded-xl border border-slate-200 p-3" open>
        <summary className="cursor-pointer text-sm font-bold text-slate-700">Original PDF for comparison</summary>
        <iframe src={pdfUrl} title="Uploaded points-table PDF" className="mt-3 h-96 w-full" />
        <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-orange-600">Open PDF in a new tab</a>
      </details>}
      {extracted && <>
        <p className="mt-4 text-sm text-slate-600">Blank fields need your input. NRR must include its sign and three decimal places, e.g. -0.216.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[1100px] text-xs">
            <thead><tr className="text-left text-slate-500"><th className="px-1 py-2">Team</th>{pointsFields.map((field) => <th className="px-1 py-2" key={field}>{labels[field]}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.team_id} className="border-t border-slate-100">
              <th scope="row" className="px-1 py-2 text-left">{teams.find((team) => team.team_id === row.team_id)?.team_name}</th>
              {pointsFields.map((field) => <td key={field} className="p-1">
                <input aria-label={`${teams.find((team) => team.team_id === row.team_id)?.team_name} ${labels[field]}`} value={row[field]} onChange={(event) => update(index, field, event.target.value)}
                  className={`w-20 rounded border p-2 ${row[field] ? "border-slate-200" : "border-red-400 bg-red-50"}`} />
              </td>)}
            </tr>)}</tbody>
          </table>
        </div>
        {validationError && <p className="mt-3 text-sm text-red-700">{validationError}</p>}
        <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />
          I compared every value, including NRR signs and overs, with the PDF.
        </label>
        <button type="button" disabled={busy || !reviewed || Boolean(validationError)} onClick={() => void save()} className="mt-5 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50">
          {busy ? "Publishing..." : "Publish Points Table"}
        </button>
      </>}
    </div>
  );
}
