import AuctionPublic from "./auction-public";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const instant = false;

export default async function AuctionHomePage({ params }: { params: Promise<{ tournament: string }> }) {
  const { tournament } = await params;
  const { data, error } = await supabaseAdmin
    .from("auction_tournaments")
    .select("tournament_logo_url")
    .eq("slug", tournament)
    .maybeSingle();
  if (error) console.error("Unable to load tournament logo for the auction viewer:", error.message);
  return <AuctionPublic key={tournament} slug={tournament} view="home" loadingLogoUrl={error ? undefined : data?.tournament_logo_url || "/mhsports-logo.png"} />;
}
