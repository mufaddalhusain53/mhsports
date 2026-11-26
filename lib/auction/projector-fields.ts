export const PROJECTOR_PLAYER_FIELDS = [
  { id: "skill", label: "Skill" },
  { id: "batting_style", label: "Batting style" },
  { id: "bowling_style", label: "Bowling style" },
  { id: "previous_team", label: "Previous team" },
] as const;

export type ProjectorPlayerField = (typeof PROJECTOR_PLAYER_FIELDS)[number]["id"];

export function isProjectorPlayerFields(value: unknown): value is ProjectorPlayerField[] {
  return Array.isArray(value)
    && value.every((field) => PROJECTOR_PLAYER_FIELDS.some((option) => option.id === field))
    && new Set(value).size === value.length;
}
