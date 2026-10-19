import Image from "next/image";

type TournamentLogoProps = {
  tournament: "friendshipcup" | "quadclash100";
  className?: string;
};

const logos = {
  friendshipcup: {
    src: "/friendship-cup-logo.png",
    alt: "Friendship Cup",
  },
  quadclash100: {
    src: "/quadclash100-logo.png",
    alt: "QuadClash 100",
  },
};

export default function TournamentLogo({
  tournament,
  className = "h-24 w-24",
}: TournamentLogoProps) {
  const logo = logos[tournament];

  return (
    <Image
      src={logo.src}
      alt={`${logo.alt} logo`}
      width={192}
      height={192}
      className={`object-contain ${className}`}
    />
  );
}
