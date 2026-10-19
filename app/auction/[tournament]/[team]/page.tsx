import AuctionPublic from "../auction-public";

export const instant = false;

export default async function AuctionTeamPage({ params }: { params: Promise<{ tournament: string; team: string }> }) {
  const { tournament, team } = await params;
  return <AuctionPublic slug={tournament} view="team" teamSlug={team} />;
}
