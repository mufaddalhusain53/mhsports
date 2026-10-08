import Link from "next/link";

export default function Home() {
  return (
    <main>

      {/* HERO SECTION */}

      <section className="relative min-h-[calc(100vh-73px)] overflow-hidden bg-slate-950 text-white">

        {/* Background glow */}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.18),_transparent_40%)]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.08),_transparent_35%)]" />


        {/* Content */}

        <div className="relative mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center px-6 py-20 md:px-10">

          <div className="max-w-4xl">

            {/* Organization */}

            <p className="mb-6 text-sm font-semibold uppercase tracking-[0.3em] text-orange-400">
              Mufaddal Husain Sports
            </p>


            {/* Main Heading */}

            <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">

              Building Champions.
              <br />

              Creating Communities.

            </h1>


            {/* Description */}

            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">

              A community-driven sports platform bringing together
              tournaments, players and cricket enthusiasts.

            </p>


            {/* CTA */}

            <div className="mt-10">

              <Link
                href="/tournaments"
                className="inline-flex items-center rounded-xl bg-orange-500 px-7 py-4 font-bold text-white transition duration-200 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/20"
              >
                Explore Tournaments
                <span className="ml-2 text-lg">→</span>
              </Link>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}