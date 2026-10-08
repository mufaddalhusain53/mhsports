export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50">

      {/* Hero */}
      <section className="bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 md:py-24 lg:px-10">
          <div className="max-w-3xl">

            <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
              About Us
            </p>

            <h1 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-6xl">
              Mufaddal Husain
              <br />
              Sports
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Building champions. Creating communities.
            </p>

          </div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 md:py-20 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-500">
              Who We Are
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              More than just cricket.
            </h2>
          </div>

          <div className="space-y-5 text-base leading-7 text-slate-600">
            <p>
              Mufaddal Husain Sports is a community-driven sports initiative
              focused on creating opportunities for people to come together
              through cricket and competitive sport.
            </p>

            <p>
              What started with a passion for grassroots cricket has grown
              into an organized platform for tournaments, competitions and
              community sporting activities.
            </p>

            <p>
              Our aim is simple — to provide a platform where players can
              compete, build friendships, develop their skills and create
              lasting memories along the way.
            </p>
          </div>

        </div>
      </section>

      {/* Our Values */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 md:py-20 lg:px-10">

          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-500">
              What We Believe
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Sport brings people together
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <ValueCard
              icon="🏏"
              title="Passion"
              description="We believe in creating opportunities for people who love the game."
            />

            <ValueCard
              icon="🤝"
              title="Community"
              description="Sport is a powerful way to connect people and strengthen relationships."
            />

            <ValueCard
              icon="🏆"
              title="Competition"
              description="We encourage healthy competition while keeping the spirit of the game alive."
            />

            <ValueCard
              icon="⭐"
              title="Excellence"
              description="We strive to make every tournament better, more organized and more memorable."
            />

          </div>
        </div>
      </section>

      {/* Tournaments */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 md:py-20 lg:px-10">

        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-500">
            Our Tournaments
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Creating platforms to compete
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600">
            From community cricket to competitive tournaments, Mufaddal
            Husain Sports aims to create sporting experiences for players
            of different backgrounds, age groups and skill levels.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">

          <TournamentCard
            title="Friendship Cup"
            description="A grassroots cricket tournament built around friendship, competition and community."
          />

          <TournamentCard
            title="Quad Clash 100"
            description="A fast-paced competitive cricket format designed to test teams under pressure."
          />

          <TournamentCard
            title="Inter Mohalla Tournament"
            description="An inter-Mohalla leather cricket championship bringing players and communities together."
          />

        </div>
      </section>

      {/* Closing */}
      <section className="px-6 pb-16 sm:px-8 md:pb-20">
        <div className="mx-auto max-w-5xl rounded-3xl bg-slate-950 px-6 py-12 text-center sm:px-10 md:py-16">

          <h2 className="text-3xl font-black text-white sm:text-4xl">
            Building Champions.
            <br />
            Creating Communities.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300">
            Because every match is more than a game — it is an opportunity
            to connect, compete and create something memorable.
          </p>

        </div>
      </section>

    </main>
  );
}

function ValueCard({
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

function TournamentCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}