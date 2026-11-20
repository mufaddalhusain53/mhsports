export type PointsTeam = { team_id: string; team_name: string };

export const pointsFields = [
  "position", "matches_played", "won", "lost", "drawn", "tied", "no_result",
  "points", "net_run_rate", "runs_for", "runs_against", "last_five",
] as const;

export type PointsField = (typeof pointsFields)[number];
export type PointsReviewRow = { team_id: string } & Record<PointsField, string>;

export function emptyPointsRow(teamId: string): PointsReviewRow {
  return {
    team_id: teamId, position: "", matches_played: "", won: "", lost: "", drawn: "",
    tied: "", no_result: "", points: "", net_run_rate: "", runs_for: "", runs_against: "", last_five: "",
  };
}

function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 0; i < a.length; i++) {
    const current = [i + 1];
    for (let j = 0; j < b.length; j++) {
      current.push(Math.min(current[j] + 1, previous[j + 1] + 1, previous[j] + (a[i] === b[j] ? 0 : 1)));
    }
    previous = current;
  }
  return previous[b.length];
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const integer = (value: string) => /^\d+$/.test(value) ? value : "";
const points = (value: string) => /^\d+(?:\.\d+)?$/.test(value) ? value : "";
const score = (value: string) => /^(?:-|\d+\/\d+(?:\.[0-5])?)$/.test(value) ? value : "";
const nrr = (value: string) => /^[+-]?\d+\.\d{3}$/.test(value) ? value : "";
const form = (value: string) => {
  if (/^\s*-+\s*$/.test(value)) return "-";
  const compact = value.toUpperCase().replace(/[\s-]/g, "");
  return /^[WLTDN]{1,5}$/.test(compact) ? compact.split("").join("-") : "";
};

function parsePass(text: string, teams: PointsTeam[]): Map<string, PointsReviewRow> {
  const result = new Map<string, PointsReviewRow>();
  const duplicates = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const tokens = line.trim().split(/\s+/);
    if (!/^[1-8]$/.test(tokens[0] ?? "")) continue;
    const candidates = teams.map((team) => {
      const count = team.team_name.trim().split(/\s+/).length;
      const observed = normalize(tokens.slice(1, count + 1).join(""));
      const expected = normalize(team.team_name);
      return { team, count, distance: distance(observed, expected), length: expected.length };
    }).filter((candidate) => candidate.distance <= Math.min(2, Math.floor(candidate.length / 4)))
      .sort((a, b) => a.distance - b.distance);
    if (!candidates.length || (candidates[1] && candidates[0].distance === candidates[1].distance)) continue;

    const { team, count } = candidates[0];
    const values = tokens.slice(count + 1);
    if (values.length < 10) continue;
    const row: PointsReviewRow = {
      team_id: team.team_id, position: tokens[0],
      matches_played: integer(values[0]), won: integer(values[1]), lost: integer(values[2]),
      drawn: integer(values[3]), tied: integer(values[4]), no_result: integer(values[5]),
      net_run_rate: nrr(values[6]), runs_for: score(values[7]), runs_against: score(values[8]),
      points: points(values[9]), last_five: form(values.slice(10).join("")),
    };
    if (result.has(team.team_id)) duplicates.add(team.team_id);
    else result.set(team.team_id, row);
  }
  for (const teamId of duplicates) result.delete(teamId);
  return result;
}

export function extractPointsRows(passes: string[], teams: PointsTeam[]): PointsReviewRow[] {
  const parsed = passes.map((pass) => parsePass(pass, teams));
  return teams.map((team) => {
    const row = emptyPointsRow(team.team_id);
    for (const field of pointsFields) {
      const values = [...new Set(parsed.map((pass) => pass.get(team.team_id)?.[field]).filter((value): value is string => Boolean(value)))];
      row[field] = values.length === 1 ? values[0] : "";
    }
    if (row.matches_played && row.last_five !== "-" && row.last_five.split("-").length > Number(row.matches_played)) {
      row.last_five = "";
    }
    return row;
  });
}

export function validatePointsRows(rows: PointsReviewRow[]): string | null {
  if (rows.length !== 8 || new Set(rows.map((row) => row.team_id)).size !== 8 || rows.some((row) => !row.team_id)) {
    return "Provide all eight different teams.";
  }
  const positions = new Set<number>();
  for (const row of rows) {
    if (pointsFields.some((field) => !row[field].trim())) return "Fill in every blank field before saving.";
    const wholeFields = ["position", "matches_played", "won", "lost", "drawn", "tied", "no_result"] as const;
    if (wholeFields.some((field) => !integer(row[field])) || !points(row.points) || !nrr(row.net_run_rate) ||
      !score(row.runs_for) || !score(row.runs_against) || !form(row.last_five)) {
      return "Check numeric values, scores, NRR (three decimal places), and last-five results.";
    }
    const position = Number(row.position);
    if (position < 1 || position > 8) return "Positions must be between 1 and 8.";
    positions.add(position);
    if (Number(row.won) + Number(row.lost) + Number(row.drawn) + Number(row.tied) + Number(row.no_result) !== Number(row.matches_played)) {
      return "For each team, wins, losses, draws, ties and no-results must add up to matches played.";
    }
    if (row.last_five !== "-" && row.last_five.replace(/[\s-]/g, "").length > Number(row.matches_played)) {
      return "Last-five results cannot exceed the number of matches played.";
    }
  }
  return positions.size === 8 ? null : "Each position must be used once.";
}
