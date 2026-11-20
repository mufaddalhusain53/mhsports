import assert from "node:assert/strict";
import test from "node:test";
import { countJerseyTeams, jerseyOptions, jerseyPrice, jerseySizes, jerseyTeams } from "./jersey-options.ts";

test("jersey charges match the organizer's agreed prices", () => {
  assert.deepEqual(jerseyOptions.map(({ value, price }) => [value, price]), [
    ["1 Half", 0], ["1 Full", 150], ["1 Full, 1 Half", 650], ["2 Full", 800],
  ]);
  assert.equal(jerseyPrice("invalid"), undefined);
  assert.equal(jerseyTeams.length, 4);
  assert.equal(jerseySizes.length, 10);
});

test("team counts include every submission and show teams with no requests", () => {
  const requests = [
    { team: "Ezzi United", payment_status: "free" },
    { team: "Ezzi United", payment_status: "pending" },
    { team: "Strikers", payment_status: "paid" },
    { team: "Other", payment_status: "not_collected" },
  ];
  assert.deepEqual(countJerseyTeams(requests), [
    { team: "Ezzi United", count: 2 },
    { team: "Multiplize Highlanders", count: 0 },
    { team: "Mavericks", count: 0 },
    { team: "Strikers", count: 1 },
    { team: "Other", count: 1 },
  ]);
  assert.equal(countJerseyTeams([]).every(({ count }) => count === 0), true);
});
