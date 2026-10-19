import AuctionPublic from "../auction-public";

export const instant = false;

export default async function AuctionPlayersPage({ params }: { params: Promise<{ tournament: string }> }) {
  const { tournament } = await params;
  return <AuctionPublic slug={tournament} view="players" />;
}
