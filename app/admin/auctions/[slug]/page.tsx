import { getAdminRole } from "@/lib/admin/auth";
import AdminLogin from "../../admin-login";
import AuctionAdminPanel from "./auction-admin-panel";

export const instant = false;

export default async function AdminAuctionPage({ params }: { params: Promise<{ slug: string }> }) {
  const role = await getAdminRole();
  if (role !== "super") return <AdminLogin auction restricted={role === "viewer"} />;
  const { slug } = await params;
  return <AuctionAdminPanel slug={slug} />;
}
