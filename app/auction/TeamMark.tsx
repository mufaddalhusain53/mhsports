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
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-24 w-24 text-3xl" : "h-14 w-14 text-lg";
  if (logoUrl) {
    const dimension = size === "sm" ? 32 : size === "lg" ? 96 : 56;
    return <AuctionImage src={logoUrl} alt={`${name} logo`} width={dimension} height={dimension} className={`${sizeClass} shrink-0 rounded-lg bg-white object-contain`} />;
  }
  return <span aria-label={`${name} logo`} className={`inline-grid shrink-0 place-items-center rounded-lg border border-orange-200 bg-gradient-to-br from-orange-100 to-amber-300 font-black tracking-wide text-orange-950 shadow-inner ${sizeClass}`}>{initials(name)}</span>;
}
