import Image from "next/image";

export default function DeveloperWatermark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2">
      <span className={`grid shrink-0 place-items-center overflow-hidden rounded-md bg-white ring-1 ring-amber-200/80 ${compact ? "h-7 w-7" : "h-10 w-10 sm:h-12 sm:w-12"}`}>
        <Image
          src="/beyond-boundaries-logo.png"
          alt=""
          width={64}
          height={64}
          className="h-full w-full scale-125 object-contain"
        />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className={compact ? "text-[8px] font-bold uppercase tracking-wide text-white/80" : "text-[9px] font-bold uppercase tracking-wide text-white/80 sm:text-[10px]"}>Developed By</span>
        <span className={compact ? "text-[10px] font-black text-amber-200" : "text-sm font-black text-amber-200 sm:text-base"}>Beyond Boundaries</span>
      </span>
    </div>
  );
}
