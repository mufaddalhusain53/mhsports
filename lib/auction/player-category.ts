export function displayPlayerCategory(category: string): string | null {
  const value = category.trim();
  return value && value.toUpperCase() !== "NONE" ? value : null;
}
