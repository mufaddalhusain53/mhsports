import Link from "next/link";

export default function InterMohallaTournamentPage() {
  return (
    <main className="min-h-screen bg-slate-50">

      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(249,115,22,0.18),transparent_35%)]" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
          <div className="max-w-4xl">

            <div className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-5 py-2">
              <span className="text-sm font-bold tracking-wide text-orange-400">
                MUFADDAL HUSAIN SPORTS
              </span>
            </div>

            <p className="mt-8 text-sm font-bold uppercase tracking-[0.3em] text-orange-400">
              Hashemi Mohalla Presents
            </p>

            <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl md:text-7xl">
              Inter Mohalla
              <br />
              Tournament
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              A leather cricket championship bringing Mohallas together
              through sport, competition and community.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tournaments/inter-mohalla/survey"
                className="inline-flex h-13 items-center justify-center rounded-xl bg-orange-500 px-7 py-3.5 text-base font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
              >
                Register Your Interest →
              </Link>

              <a
                href="#about"
                className="inline-flex h-13 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-base font-bold text-white transition hover:bg-white/10"
              >
                Explore Tournament
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section
        id="about"
        className="mx-auto max-w-7xl px-6 py-16 sm:px-8 md:py-20 lg:px-10"
      >
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">

          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-500">
              About the Tournament
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              More than cricket.
              <br />
              It&apos;s about bringing us together.
            </h2>

            <div className="mt-6 space-y-4 text-base leading-7 text-slate-600">
              <p>
                MH Sports is organizing an{" "}
                <strong className="text-slate-900">
                  Inter-Mohalla Leather Cricket Tournament
                </strong>{" "}
                in association with{" "}
                <strong className="text-slate-900">
                  Hashemi Mohalla
                </strong>{" "}
                for players from Mumbai &amp; Marol Jamiat.
              </p>

              <p>
                The tournament aims to bring players from different
                Jamaats and Mohallas together through competitive
                leather-ball cricket while creating stronger community
                connections.
              </p>

              <p>
                Players will get the opportunity to represent their
                Mohalla, compete as a team and be part of a new community
                cricket initiative.
              </p>
            </div>
          </div>

          {/* HIGHLIGHT CARD */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <div className="mb-6">
              <div className="text-sm font-black uppercase tracking-[0.2em] text-orange-500">
                Proposed Schedule
              </div>

              <h3 className="mt-2 text-2xl font-black text-slate-950">
                January 2027
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Tentative start, subject to completion of the preceding
                tournaments.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <InfoCard
                title="Match Day"
                value="Every Saturday"
              />

              <InfoCard
                title="Match Time"
                value="7:00 AM – 9:00 AM"
              />

              <InfoCard
                title="Additional Days"
                value="National Holidays"
              />

              <InfoCard
                title="Contingency"
                value="Mondays, if required"
              />
            </div>
          </div>

        </div>
      </section>

      {/* WHY */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 md:py-20 lg:px-10">

          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-500">
              The Idea
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Why Inter Mohalla?
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Cricket has always been a powerful way to bring people
              together. This tournament is an opportunity to take that
              spirit beyond individual teams and create a competition
              where every Mohalla has something to represent.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <FeatureCard
              icon="🏏"
              title="Leather Cricket"
              description="Competitive leather-ball cricket for players who love the game."
            />

            <FeatureCard
              icon="🤝"
              title="Community"
              description="Connect players and families across different Mohallas."
            />

            <FeatureCard
              icon="🏆"
              title="Competition"
              description="Represent your Mohalla and compete for the championship."
            />

            <FeatureCard
              icon="❤️"
              title="Togetherness"
              description="Build friendships and strengthen community bonds through sport."
            />

          </div>
        </div>
      </section>

      {/* WHO CAN PARTICIPATE */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 md:py-20 lg:px-10">

        <div className="rounded-3xl bg-slate-950 px-6 py-10 sm:px-10 md:px-14 md:py-14">

          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">

            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
                Calling All Players
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Want to represent your Mohalla?
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
                We are identifying players from Mumbai &amp; Marol Jamiat
                who regularly play leather cricket and may be interested
                in participating in the tournament.
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Complete the player survey to register your interest.
                Submission of the survey does not guarantee selection.
              </p>
            </div>

            <Link
              href="/tournaments/inter-mohalla/survey"
              className="inline-flex h-14 items-center justify-center rounded-xl bg-orange-500 px-7 text-base font-black text-white transition hover:bg-orange-600"
            >
              Take the Player Survey →
            </Link>

          </div>
        </div>
      </section>

      {/* SCHEDULE NOTE */}
      <section className="pb-16">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-8">

          <p className="text-sm leading-6 text-slate-500">
            Matches are proposed to be played every{" "}
            <strong className="text-slate-700">
              Saturday from 7:00 AM to 9:00 AM
            </strong>
            , tentatively starting from{" "}
            <strong className="text-slate-700">
              January 2027
            </strong>
            .
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Matches may also be scheduled on National Holidays. In case of
            delays or unavoidable circumstances, Mondays may occasionally
            be used.
          </p>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center sm:px-8 lg:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            Inter Mohalla Tournament
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Mufaddal Husain Sports • In association with Hashemi Mohalla
          </p>
        </div>
      </footer>

    </main>
  );
}

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <p className="mt-1 text-base font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <div className="text-3xl">{icon}</div>

      <h3 className="mt-5 text-lg font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}