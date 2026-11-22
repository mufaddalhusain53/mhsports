export function sortSponsors<T extends { id: string; name: string; display_order: number }>(sponsors: T[]): T[] {
  return [...sponsors].sort((a, b) =>
    a.display_order - b.display_order || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
  );
}
