type AuctionResultTagProps = {
  status: "sold" | "unsold";
  className?: string;
};

export default function AuctionResultTag({ status, className = "" }: AuctionResultTagProps) {
  const sold = status === "sold";
  return (
    <div
      className={`pointer-events-none absolute right-3 top-3 z-10 -rotate-6 rounded-lg border-2 px-4 py-1.5 text-lg font-black uppercase tracking-[0.16em] shadow-xl sm:right-5 sm:top-5 sm:px-6 sm:py-2 sm:text-2xl ${
        sold
          ? "border-emerald-200 bg-emerald-600 text-white"
          : "border-red-200 bg-red-600 text-white"
      } ${className}`}
      aria-label={sold ? "Player sold" : "Player unsold"}
    >
      {sold ? "Sold" : "Unsold"}
    </div>
  );
}
