import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Beyond Boundaries (Admin)" },
  icons: {
    icon: "/beyond-boundaries-logo.png",
    shortcut: "/beyond-boundaries-logo.png",
    apple: "/beyond-boundaries-logo.png",
  },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
