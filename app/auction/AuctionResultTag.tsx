type AuctionResultTagProps = {
  status: "sold" | "unsold" | "rtm";
  className?: string;
};

export default function AuctionResultTag({ status, className = "" }: AuctionResultTagProps) {
  const isRTM = status === "rtm";
  const sold = status === "sold" || isRTM;
  return (
    <div
      className={`pointer-events-none absolute right-3 top-3 z-10 -rotate-12 rounded-xl border-[4px] px-8 py-3 text-3xl font-black uppercase tracking-[0.18em] shadow-[0_0_36px_rgba(0,0,0,0.35)] sm:right-5 sm:top-5 sm:px-10 sm:py-4 sm:text-5xl ${
        isRTM
          ? "border-amber-100 bg-amber-500 text-slate-950"
          : sold
            ? "border-emerald-100 bg-emerald-500 text-slate-950"
            : "border-red-100 bg-red-500 text-white"
      } ${className}`}
      aria-label={isRTM ? "Player sold through Right To Match" : sold ? "Player sold" : "Player unsold"}
    >
      {isRTM ? "Right To Match" : sold ? "Sold" : "Unsold"}
    </div>
  );
}
