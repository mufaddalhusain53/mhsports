import QuadClashRegistrationForm from "./registration-form";
import RegistrationHeader from "../registration-header";

const tournamentHighlights = [
  "100-ball tournament",
  "4 teams",
  "League stage + 3rd place playoff + final",
  "4 matches per team",
];

export default function Registration() {
  return (
    <main className="min-h-screen site-page-surface px-4 py-8 text-slate-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <RegistrationHeader
          title="Player Registration"
          description="Get ready for a memorable season of cricket, competition and community."
        />

        <section
          aria-labelledby="tournament-details"
          className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-fuchsia-700">Season 2 details</p>
              <h2 id="tournament-details" className="mt-1 text-2xl font-black">Tournament information</h2>
            </div>
            <span className="rounded-xl bg-fuchsia-50 px-4 py-2 text-sm font-black text-fuchsia-800">Player Fees · ₹3,000</span>
          </div>
          <h3 className="mt-6 text-lg font-extrabold">What’s Included?</h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <h4 className="font-bold">🏟 Tournament Format</h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-slate-600">
                {tournamentHighlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <h4 className="font-bold">🍴 Food &amp; Accommodation</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Food and stay included for all players.
              </p>
              <h4 className="mt-4 font-bold">👕 Kit</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Official tournament jersey provided. Players have to get their
                own white tracks.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <h4 className="font-bold">🏊 Extras</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Swimming pool access.
              </p>
              <h4 className="mt-4 font-bold">📺 Live Streaming</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                All matches streamed live.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <h4 className="font-bold">⚡ Experience</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                A compact, high-intensity cricket tournament with competitive
                action and great off-field comfort!
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-fuchsia-100 bg-fuchsia-50 p-4 text-sm font-semibold leading-6 text-slate-700">
            <p>🗓 Dates: 20, 21, 22 March 2027</p>
            <p>📍 Venue: Eprashala Cricket Ground, Kasara</p>
          </div>

          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <h4 className="font-black text-red-800">🚫 Important Notice</h4>
            <p className="mt-1 text-sm leading-6 text-red-800">
              Muharramat (smoking, alcohol, tobacco, etc.) are strictly
              prohibited during the tournament. Any player found violating this
              rule will be removed from the team immediately.
            </p>
          </div>
        </section>

        <QuadClashRegistrationForm />
      </div>
    </main>
  );
}
