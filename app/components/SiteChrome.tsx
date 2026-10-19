"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";
import Navbar from "./Navbar";

export default function SiteChrome() {
  const pathname = usePathname();
  if (pathname === "/auction" || pathname.startsWith("/auction/")) return null;
  return (
    <>
      <Navbar />
      <Footer />
    </>
  );
}
