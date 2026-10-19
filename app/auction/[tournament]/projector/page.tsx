import AuctionProjector from "./projector";

export const instant = false;

export default async function AuctionProjectorPage({ params }: { params: Promise<{ tournament: string }> }) {
  const { tournament } = await params;
  return <AuctionProjector slug={tournament} />;
}
