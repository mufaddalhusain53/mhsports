import AuctionOverlay from "./overlay";

export const instant = false;

export default async function AuctionOverlayPage({ params }: { params: Promise<{ tournament: string }> }) {
  const { tournament } = await params;
  return <AuctionOverlay slug={tournament} />;
}
