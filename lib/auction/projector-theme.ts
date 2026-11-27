export type ProjectorTheme = "classic" | "spotlight";

export function isProjectorTheme(value: unknown): value is ProjectorTheme {
  return value === "classic" || value === "spotlight";
}
