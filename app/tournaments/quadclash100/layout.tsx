import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "QUADCLASH 100" },
  icons: {
    icon: "/quadclash100-logo.png",
    shortcut: "/quadclash100-logo.png",
    apple: "/quadclash100-logo.png",
  },
};

export default function QuadClashLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
