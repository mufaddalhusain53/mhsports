import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Beyond Auctions" },
  icons: {
    icon: "/beyond-auctions-logo.png",
    shortcut: "/beyond-auctions-logo.png",
    apple: "/beyond-auctions-logo.png",
  },
};

export default function AuctionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
