import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata: Metadata = {
  title: "Mufaddal Husain Sports",
  description:
    "Community cricket tournaments organized by Mufaddal Husain Sports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900">

        <Navbar />

        {children}

      </body>
    </html>
  );
}