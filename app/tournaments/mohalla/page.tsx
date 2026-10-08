import Link from "next/link";

export default function MohallaPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <section className="px-6 py-24 md:px-10">

        <div className="mx-auto max-w-5xl">

          <span className="inline-flex rounded-full bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-400">
            Mufaddal Husain Sports
          </span>

          <h1 className="mt-7 text-5xl font-black tracking-tight md:text-7xl">
            Mohalla
            <br />
            Tournament
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            A new community cricket initiative designed to bring
            Mohallas together through sport, competition and
            camaraderie.
          </p>

          <div className="mt-10">

            <Link
              href="/tournaments/mohalla/survey"
              className="inline-block rounded-xl bg-orange-500 px-7 py-4 font-bold text-white transition hover:bg-orange-600"
            >
              Take the Survey →
            </Link>

          </div>

        </div>

      </section>


      <section className="bg-white px-6 py-20 text-slate-900 md:px-10">

        <div className="mx-auto max-w-5xl">

          <h2 className="text-3xl font-black">
            Help Us Shape the Tournament
          </h2>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            We are currently collecting feedback from the community
            to understand interest, participation and preferences
            for the upcoming Mohalla Tournament.
          </p>

          <div className="mt-8 rounded-2xl border border-orange-200 bg-orange-50 p-6">

            <p className="font-semibold text-orange-900">
              Your feedback will help us design the tournament
              around the community.
            </p>

          </div>

        </div>

      </section>

    </main>
  );
}