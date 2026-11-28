import Link from "next/link";
import DeveloperWatermark from "../auction/DeveloperWatermark";

export default function Footer({ showAdminLink = false }: { showAdminLink?: boolean }) {
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-slate-200 bg-white px-4 py-4">
      <DeveloperWatermark prominent />
      {showAdminLink && (
        <Link href="/admin" className="text-sm font-bold text-slate-600 underline decoration-slate-400 underline-offset-4 transition hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">
          Admin Login
        </Link>
      )}
    </footer>
  );
}
