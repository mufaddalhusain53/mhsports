import AuctionImage from "@/app/components/AuctionImage";

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export default function TeamMark({
  name,
  logoUrl,
  size = "md",
}: {
  name: string;
  logoUrl: string | null;
  size?: "sm" | "md" | "lg" | "viewer" | "projector";
}) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs"
    : size === "lg" ? "h-24 w-24 text-3xl"
    : size === "projector" ? "h-[min(24dvh,23vw,14rem,max(3rem,calc(100dvh_-_31rem)))] w-[min(24dvh,23vw,14rem,max(3rem,calc(100dvh_-_31rem)))] text-[min(5dvh,6vw,4rem)]"
    : size === "viewer" ? "h-[clamp(3.75rem,19vw,4.5rem)] w-[clamp(3.75rem,19vw,4.5rem)] text-xl sm:h-28 sm:w-28 sm:text-3xl lg:aspect-square lg:h-auto lg:w-full 2xl:h-36 2xl:w-36 [@media(min-width:1024px)_and_(max-height:760px)]:h-[14dvh] [@media(min-width:1024px)_and_(max-height:760px)]:w-[14dvh]"
    : "h-14 w-14 text-lg";
  if (logoUrl) {
    const dimension = size === "sm" ? 32 : size === "lg" ? 96 : size === "projector" ? 224 : size === "viewer" ? 144 : 56;
    return <AuctionImage src={logoUrl} alt={`${name} logo`} width={dimension} height={dimension} className={`${sizeClass} shrink-0 rounded-lg bg-white object-contain`} />;
  }
  return <span aria-label={`${name} logo`} className={`inline-grid shrink-0 place-items-center rounded-lg border border-orange-200 bg-gradient-to-br from-orange-100 to-amber-300 font-black tracking-wide text-orange-950 shadow-inner ${sizeClass}`}>{initials(name)}</span>;
}
