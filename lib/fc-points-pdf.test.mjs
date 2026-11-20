import assert from "node:assert/strict";
import test from "node:test";
import { extractPointsRows, validatePointsRows } from "./fc-points-pdf.ts";

const teams = [
  "Shabbir Lions", "Ezzi United", "Ulcc", "Saifee Star", "Unix Star",
  "Jolly Cricketers", "Vista Vikings", "Multiplize Highlanders",
].map((team_name, index) => ({ team_id: String(index + 1), team_name }));

const firstPass = `
1 Shabbir Lions 4 4 0 0 0 0 1.646 461/48 382/48 8 W-W-W-W
2 Ezzi United 4 2 2 0 0 0 0.504 354/441 353/47 4 W-L-L-W
3 Ulec 4 2 2 0 0 0 0.242 358/43.4 366/46 a4 L-W-W-L
4 Saifee Star 4 2 2 0 0 0 0.083 384/48 380/48 4 L-L-wW-w
5 Unix Star 4 2 2 0 0 0 -0.053 416/48 404/46.2 4 W-L-L-W
6 Jolly Cricketers 4 2 2 0 0 0 -0.216 380/46.2 376/44.4 4 W-W-L-L
7 Vista Vikings 4 2 2 0 0 0 -0.768 381/46.1 433/48 4 L-W-W-L
8 Multiplize Highlanders 4 0 4 0 0 0 -1.557 380/48 420/44.2 0 [EEEN`;
const secondPass = `
1 Shabbir Lions 4 4 0 0 0 0 1.646 461/48 382/48 8 W-W-W-W
2 Ezz United 4 2 2 0 0 0 0.504 354/44.1 353/47 4 W-L-L-W
3 Ulec a 2 2 0 0 0 0.242 358/43.4 366/46 4 LWW
4 saifee Star 4 2 2 0 0 0 0.083 384/48 380/48 4 LL WwW
5 Unix Star a 2 2 0 0 0 -0.053 416/48 404/46.2 4 W-LL-W
6 Jolly Cricketers 4 2 2 0 0 0 0.216 380/46.2 376/44.4 4 W-WHLL
7 Vista Vikings 4 2 2 0 0 0 0.768 381/46.1 433/48 4 LWW
8 Multiplize Highlanders 4 0 4 0 0 0 -1.557 380/48 420/44.2 0 LLLL`;

test("matches teams and leaves conflicting or invalid OCR fields blank", () => {
  const rows = extractPointsRows([firstPass, secondPass], teams);
  assert.equal(rows[0].matches_played, "4");
  assert.equal(rows[1].runs_for, "");
  assert.equal(rows[2].points, "4");
  assert.equal(rows[2].last_five, "");
  assert.equal(rows[3].last_five, "");
  assert.equal(rows[5].net_run_rate, "");
  assert.equal(rows[6].net_run_rate, "");
  assert.equal(rows[7].points, "0");
  assert.equal(rows[7].last_five, "L-L-L-L");
  assert.match(validatePointsRows(rows), /blank/);
});

test("requires complete, consistent standings before publishing", () => {
  const rows = extractPointsRows([firstPass, secondPass], teams);
  Object.assign(rows[1], { runs_for: "354/44.1" });
  Object.assign(rows[2], { last_five: "L-W-W-L" });
  Object.assign(rows[3], { last_five: "L-L-W-W" });
  Object.assign(rows[5], { net_run_rate: "-0.216" });
  Object.assign(rows[6], { net_run_rate: "-0.768", last_five: "L-W-W-L" });
  assert.equal(validatePointsRows(rows), null);
  rows[0].won = "3";
  assert.match(validatePointsRows(rows), /add up/);
  rows[0].won = "4";
  rows[0].net_run_rate = "1.64";
  assert.match(validatePointsRows(rows), /three decimal/);
  Object.assign(rows[0], { matches_played: "0", won: "0", net_run_rate: "0.000", runs_for: "-", runs_against: "-", last_five: "-" });
  assert.equal(validatePointsRows(rows), null);
});

test("does not use duplicated team rows from a pass", () => {
  const rows = extractPointsRows([`${firstPass}\n${firstPass}`, ""], teams);
  assert.equal(rows[0].matches_played, "");
});
