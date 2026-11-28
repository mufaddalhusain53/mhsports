import Link from "next/link";
import { getAdminRole } from "../../lib/admin/auth";
import { supabaseAdmin } from "../../lib/supabase/admin";
import AdminDashboard, { type AdminView } from "./admin-dashboard";
import AdminLogin from "./admin-login";
import { notFound } from "next/navigation";
import { INTER_MOHALLA_ENABLED } from "@/lib/tournament-features";

export const instant = false;

export default async function AdminSectionPage({
  view,
}: {
  view: AdminView;
}) {
  if (view === "mohalla-survey" && !INTER_MOHALLA_ENABLED) notFound();
  const role = await getAdminRole();
  if (!role) {
    return <AdminLogin />;
  }
  const readOnly = role === "viewer";
  if (readOnly && view !== "quadclash100-registration" && view !== "quadclash100-jersey" && view !== "mohalla-survey") {
    return <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-black text-slate-900">Access restricted</h1>
      <p className="mt-3 text-slate-600">This section is available to the super admin only.</p>
      <Link href="/admin" className="mt-4 inline-block font-bold text-orange-700">Back to admin home</Link>
    </main>;
  }

  if (view !== "mohalla-survey") {
    return <AdminDashboard view={view} responses={[]} readOnly={readOnly} />;
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
      readOnly={readOnly}
    />
  );
}
