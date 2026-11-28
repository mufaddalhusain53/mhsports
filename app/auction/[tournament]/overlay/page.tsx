import type { Metadata } from "next";
import AuctionOverlay from "./overlay";

export const metadata: Metadata = {
  title: { absolute: "Beyond Auctions Overlay" },
};

export const instant = false;

export default async function AuctionOverlayPage({ params }: { params: Promise<{ tournament: string }> }) {
  const { tournament } = await params;
  return <AuctionOverlay slug={tournament} />;
}
