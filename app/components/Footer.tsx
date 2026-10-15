import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-6 py-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
          <span>Developed By</span>
          <Image
            src="/beyond-boundaries-logo.png"
            alt="Beyond Boundaries"
            width={64}
            height={64}
            className="h-12 w-12 rounded-full object-cover"
          />
        </div>
      </div>
    </footer>
  );
}
