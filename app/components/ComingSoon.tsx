export default function ComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-slate-50 px-6">
      <div className="max-w-xl text-center">

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-4xl">
          🚧
        </div>

        <p className="mt-8 text-sm font-bold uppercase tracking-[0.25em] text-orange-500">
          Mufaddal Husain Sports
        </p>

        <h1 className="mt-3 text-4xl font-black text-slate-900">
          {title}
        </h1>

        <p className="mt-5 text-lg leading-8 text-slate-600">
          {description ||
            "This section is currently being developed. Stay tuned for updates."}
        </p>

        <div className="mt-8 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">
          COMING SOON
        </div>

      </div>
    </main>
  );
}