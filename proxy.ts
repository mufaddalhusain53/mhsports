import { NextResponse, type NextRequest } from "next/server";
import { AUCTION_DOMAIN, MAIN_SITE_ORIGIN } from "./lib/auction/domains";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  if (host !== AUCTION_DOMAIN) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/auction${search}`, `https://${AUCTION_DOMAIN}`));
  }
  if (
    pathname === "/auction" || pathname.startsWith("/auction/")
    || pathname === "/api" || pathname.startsWith("/api/")
    || pathname === "/_next" || pathname.startsWith("/_next/")
    || /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL(`${pathname}${search}`, MAIN_SITE_ORIGIN));
}
