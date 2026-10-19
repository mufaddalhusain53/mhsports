import Link from "next/link";
import TournamentLogo from "../../../components/TournamentLogo";
import QuadClashRegistrationForm from "./registration-form";

const tournamentHighlights = [
  "100-ball tournament",
  "4 teams",
  "League stage + 3rd place playoff + final",
  "4 matches per team",
];

export default function Registration() {
  return (
    <main className="min-h-screen site-page-surface px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/tournaments/quadclash100"
          className="inline-flex items-center gap-2 rounded-lg border border-orange-400/40 bg-orange-500/10 px-4 py-2.5 text-sm font-extrabold text-orange-600 transition hover:border-orange-300 hover:bg-orange-500/20"
        >
          ← Back to QuadClash 100
        </Link>

        <div className="mt-8">
          <TournamentLogo tournament="quadclash100" className="h-28 w-28 sm:h-36 sm:w-36" />
        </div>
        <h1 className="mt-4 text-4xl font-black sm:text-5xl">Player Registration</h1>

        <section
          aria-labelledby="tournament-details"
          className="mt-6 rounded-2xl border border-orange-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <h2 id="tournament-details" className="text-2xl font-black">
            🏏 Player Fees – ₹3,000
          </h2>
          <h3 className="mt-5 text-lg font-extrabold">What’s Included?</h3>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <h4 className="font-bold">🏟 Tournament Format</h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-slate-600">
                {tournamentHighlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold">🍴 Food &amp; Accommodation</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Food and stay included for all players.
              </p>
              <h4 className="mt-4 font-bold">👕 Kit</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Official tournament jersey provided. Players have to get their
                own black tracks.
              </p>
            </div>
            <div>
              <h4 className="font-bold">🏊 Extras</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Swimming pool access.
              </p>
              <h4 className="mt-4 font-bold">📺 Live Streaming</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                All matches streamed live.
              </p>
            </div>
            <div>
              <h4 className="font-bold">⚡ Experience</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                A compact, high-intensity cricket tournament with competitive
                action and great off-field comfort!
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-orange-50 p-4 text-sm font-semibold leading-6 text-slate-700">
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
