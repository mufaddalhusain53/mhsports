export const instant = false;
import { isAdminAuthenticated } from "../../lib/admin/auth";
import { supabaseAdmin } from "../../lib/supabase/admin";
import AdminDashboard from "./admin-dashboard";
import AdminLogin from "./admin-login";

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return <AdminLogin />;
  }

  const { data, error } = await supabaseAdmin
    .from("mohalla_survey_responses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-black text-red-600">
            Unable to load registrations
          </h1>

          <p className="mt-3 text-slate-600">
            {error.message}
          </p>
        </div>
      </main>
    );
  }

  return <AdminDashboard responses={data ?? []} />;
}