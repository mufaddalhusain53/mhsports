import { isAdminAuthenticated } from "@/lib/admin/auth";
import AdminLogin from "../admin-login";
import AdminAuctions from "./admin-auctions";

export const instant = false;

export default async function AdminAuctionsPage() {
  if (!(await isAdminAuthenticated())) return <AdminLogin />;
  return <AdminAuctions />;
}
