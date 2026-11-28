import Image from "next/image";

export default function DeveloperWatermark({ compact = false, prominent = false }: { compact?: boolean; prominent?: boolean }) {
  return (
    <div className={`flex shrink-0 items-center justify-center gap-2 ${prominent ? `w-fit rounded-xl bg-gradient-to-r from-slate-950/95 via-blue-950/90 to-sky-900/85 shadow-[0_6px_20px_rgba(2,6,23,0.35)] ring-1 ring-cyan-200/20 ${compact ? "px-1.5 py-0.5" : "px-2 lg:px-3 lg:py-2 [@media(min-width:1024px)_and_(max-height:600px)]:py-1"}` : ""}`}>
      <span className={`grid shrink-0 place-items-center overflow-hidden rounded-md bg-white ring-1 ring-amber-200/80 ${compact ? "h-7 w-7" : "h-10 w-10 sm:h-12 sm:w-12"} ${prominent && !compact ? "lg:h-14 lg:w-14 lg:rounded-xl lg:ring-cyan-200/70 [@media(min-width:1024px)_and_(max-height:600px)]:h-10 [@media(min-width:1024px)_and_(max-height:600px)]:w-10" : ""}`}>
        <Image
          src="/beyond-boundaries-logo.png"
          alt=""
          width={64}
          height={64}
          className="h-full w-full scale-125 object-contain"
        />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className={`${compact ? "text-[8px] font-bold uppercase tracking-wide text-white/80" : "text-[9px] font-bold uppercase tracking-wide text-white/80 sm:text-[10px]"} ${prominent ? "tracking-[0.16em] text-cyan-200" : ""}`}>Developed By</span>
        <span className={`${compact ? "text-[10px] font-black text-amber-200" : "text-sm font-black text-amber-200 sm:text-base"} ${prominent && !compact ? "lg:text-lg" : ""}`}>Beyond Boundaries</span>
      </span>
    </div>
  );
}
