"use client";

export default function PlayerSearch({ value, onChange, placeholder, className = "" }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return <div className={`relative min-w-0 ${className}`}>
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-cyan-200 sm:h-3.5 sm:w-3.5">
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 4 4" />
    </svg>
    <input value={value} onChange={(event) => onChange(event.target.value)} aria-label="Search players" placeholder={placeholder} className="h-8 w-full min-w-0 rounded-full border border-cyan-200/35 bg-slate-950/60 pl-6 pr-1 text-[10px] text-white shadow-inner outline-none transition placeholder:text-blue-100/70 hover:border-cyan-200/60 focus:border-cyan-200 focus:ring-2 focus:ring-cyan-300/40 sm:pl-7 sm:pr-3 sm:text-xs" />
  </div>;
}
