import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Friendship Cup" },
  icons: {
    icon: "/friendship-cup-logo.png",
    shortcut: "/friendship-cup-logo.png",
    apple: "/friendship-cup-logo.png",
  },
};

export default function FriendshipCupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
