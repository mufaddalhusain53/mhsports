export type ViewerSquadView = "cards" | "field";

export function isViewerSquadView(value: unknown): value is ViewerSquadView {
  return value === "cards" || value === "field";
}
