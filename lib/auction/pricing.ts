export type AuctionPriceCategory = { id: string; base_price: number };

export function getAuctionBasePrice(
  player: { category_id: string | null } | null | undefined,
  categories: readonly AuctionPriceCategory[],
  tournamentBasePrice: number,
) {
  return categories.find((category) => category.id === player?.category_id)?.base_price ?? tournamentBasePrice;
}

export function upsertAuctionCategory<T extends AuctionPriceCategory>(categories: T[], category: T): T[] {
  return categories.some((item) => item.id === category.id)
    ? categories.map((item) => item.id === category.id ? category : item)
    : [...categories, category];
}
