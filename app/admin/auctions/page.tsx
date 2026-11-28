import { getAdminRole } from "@/lib/admin/auth";
import AdminLogin from "../admin-login";
import AdminAuctions from "./admin-auctions";

export const instant = false;

export default async function AdminAuctionsPage() {
  const role = await getAdminRole();
  if (role !== "super") return <AdminLogin auction restricted={role === "viewer"} />;
  return <AdminAuctions />;
}
