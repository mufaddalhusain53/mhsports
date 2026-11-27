export const AUCTION_DOMAIN = "beyondauctions.vercel.app";
export const MAIN_SITE_ORIGIN = "https://mhsports53.vercel.app";

export function getAuctionOrigin(hostname: string, origin: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
    ? origin
    : `https://${AUCTION_DOMAIN}`;
}
