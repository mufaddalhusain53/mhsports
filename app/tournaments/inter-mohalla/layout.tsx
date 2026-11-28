import { notFound } from "next/navigation";
import { INTER_MOHALLA_ENABLED } from "@/lib/tournament-features";

export default function InterMohallaLayout({ children }: { children: React.ReactNode }) {
  if (!INTER_MOHALLA_ENABLED) notFound();
  return children;
}
