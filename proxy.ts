import { NextResponse, type NextRequest } from "next/server";
import { AUCTION_DOMAIN, MAIN_SITE_ORIGIN } from "./lib/auction/domains";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  const { pathname, search } = request.nextUrl;
  const isAuctionAdmin = pathname === "/admin/auctions" || pathname.startsWith("/admin/auctions/");
  if (host === new URL(MAIN_SITE_ORIGIN).hostname && isAuctionAdmin) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, `https://${AUCTION_DOMAIN}`));
  }
  if (host !== AUCTION_DOMAIN) return NextResponse.next();

  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/auction${search}`, `https://${AUCTION_DOMAIN}`));
  }
  if (
    isAuctionAdmin
    || pathname === "/auction" || pathname.startsWith("/auction/")
    || pathname === "/api" || pathname.startsWith("/api/")
    || pathname === "/_next" || pathname.startsWith("/_next/")
    || /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL(`${pathname}${search}`, MAIN_SITE_ORIGIN));
}
