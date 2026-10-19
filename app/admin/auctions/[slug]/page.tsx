import { isAdminAuthenticated } from "@/lib/admin/auth";
import AdminLogin from "../../admin-login";
import AuctionAdminPanel from "./auction-admin-panel";

export const instant = false;

export default async function AdminAuctionPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdminAuthenticated())) return <AdminLogin />;
  const { slug } = await params;
  return <AuctionAdminPanel slug={slug} />;
}
