import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata: Metadata = {
  title: "Mufaddal Husain Sports",
  description:
    "Community cricket, tournaments and sporting events by Mufaddal Husain Sports.",

  icons: {
    icon: "/mhsports-logo.png",
    shortcut: "/mhsports-logo.png",
    apple: "/mhsports-logo.png",
  },

  openGraph: {
    title: "Mufaddal Husain Sports",
    description:
      "Community cricket, tournaments and sporting events by Mufaddal Husain Sports.",
    url: "https://mhsports53.vercel.app",
    siteName: "Mufaddal Husain Sports",
    type: "website",
    images: [
      {
        url: "/mhsports-logo.png",
        width: 512,
        height: 512,
        alt: "Mufaddal Husain Sports",
      },
    ],
  },

  twitter: {
    card: "summary",
    title: "Mufaddal Husain Sports",
    description:
      "Community cricket, tournaments and sporting events by Mufaddal Husain Sports.",
    images: ["/mhsports-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}