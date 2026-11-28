import JerseyForm from "./jersey-form";
import RegistrationHeader from "../registration-header";

export const metadata = { title: "QC 100 Season 2 Jersey" };

export default function JerseyPage() {
  return <main className="min-h-screen site-page-surface px-4 py-8 text-slate-950 sm:px-6 sm:py-12">
    <div className="mx-auto max-w-4xl">
      <RegistrationHeader
        title="QC 100 Season 2 Jersey"
        description="Share your jersey details and choose your preferred size and sleeve option."
      />
      <JerseyForm />
    </div>
  </main>;
}
