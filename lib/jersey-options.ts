export const jerseyTeams = ["Ezzi United", "Multiplize Highlanders", "Mavericks", "Strikers"] as const;
export function countJerseyTeams(requests: ReadonlyArray<{ team: string }>) {
  const counts = new Map<string, number>(jerseyTeams.map((team) => [team, 0]));
  for (const { team } of requests) counts.set(team, (counts.get(team) ?? 0) + 1);
  return Array.from(counts, ([team, count]) => ({ team, count }));
}

export const validJerseyId = (id: unknown): id is string =>
  typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export const jerseySizes = ["32", "34", "36", "38", "40", "42", "44", "46", "48", "50"] as const;
export const jerseyOptions = [
  { value: "1 Half", price: 0 },
  { value: "1 Full", price: 150 },
  { value: "1 Full, 1 Half", price: 650 },
  { value: "2 Full", price: 800 },
] as const;

export function jerseyPrice(option: string): number | undefined {
  return jerseyOptions.find((item) => item.value === option)?.price;
}
