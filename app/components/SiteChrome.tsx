"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";
import Navbar from "./Navbar";

export default function SiteChrome({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  if (pathname === "/auction" || pathname.startsWith("/auction/")) return children;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAuctionAdmin = pathname === "/admin/auctions" || pathname.startsWith("/admin/auctions/");
  return (
    <>
      <Navbar brand={isAuctionAdmin ? "auction" : isAdmin ? "admin" : "site"} />
      {isAuctionAdmin && <Footer />}
      {children}
      {!isAdmin && <Footer showAdminLink />}
    </>
  );
}
