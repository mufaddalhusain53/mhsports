import { isAdminAuthenticated } from "../../lib/admin/auth";
import { supabaseAdmin } from "../../lib/supabase/admin";
import AdminDashboard, { type AdminView } from "./admin-dashboard";
import AdminLogin from "./admin-login";

export const instant = false;

export default async function AdminSectionPage({
  view,
}: {
  view: AdminView;
}) {
  if (!(await isAdminAuthenticated())) {
    return <AdminLogin />;
  }

  if (view !== "mohalla-survey") {
    return <AdminDashboard view={view} responses={[]} />;
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
          <p className="mt-3 text-slate-600">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <AdminDashboard
      view={view}
      responses={data ?? []}
    />
  );
}
