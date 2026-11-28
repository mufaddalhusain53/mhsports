"use client";

import { memo } from "react";
import AuctionImage from "@/app/components/AuctionImage";
import { displayPlayerCategory } from "@/lib/auction/player-category";
import type { ProjectorPlayerField } from "@/lib/auction/projector-fields";

type Player = {
  player_number: number; full_name: string; category: string; role: string | null;
  batting_style: string | null; bowling_style: string | null; photo_url: string | null;
  status: "available" | "sold" | "unsold"; sold_team_id: string | null; sold_price: number | null; rtm_team_id: string | null;
};

const PlayerCard = memo(function PlayerCard({ player, teams, rtmEnabled, playerFields, showCategory, compactMobile = false, dense = false }: {
  player: Player;
  teams: { id: string; name: string }[];
  rtmEnabled: boolean;
  playerFields: ProjectorPlayerField[];
  showCategory: boolean;
  compactMobile?: boolean;
  dense?: boolean;
}) {
  const soldTeam = teams.find((item) => item.id === player.sold_team_id);
  const category = displayPlayerCategory(player.category);
  const soldPrice = player.sold_price === null || player.sold_price === undefined ? "—" : Number(player.sold_price).toLocaleString("en-IN");
  return (
    <article className={`relative min-w-0 overflow-hidden rounded-xl border shadow-md backdrop-blur-sm ${dense ? "p-2" : compactMobile ? "p-2 sm:min-h-36 sm:p-3" : "min-h-36 p-3"} ${player.status === "sold" ? "border-green-400/60 bg-gradient-to-r from-green-900/80 to-slate-900/75 text-white" : player.status === "unsold" ? "border-red-300/70 bg-gradient-to-r from-red-900/75 to-slate-900/75 text-white" : "border-white/30 bg-slate-950/55 text-white"}`}>
      <span className={`absolute left-0 top-0 rounded-br-lg px-2 py-1 text-xs font-black ${player.status === "sold" ? "bg-green-500" : player.status === "unsold" ? "bg-red-400 text-red-950" : "bg-slate-300 text-slate-900"}`}>#{player.player_number}</span>
      <div className={`flex ${dense ? "gap-2 pt-3" : `gap-3 ${compactMobile ? "pt-3 sm:pt-2" : "pt-2"}`}`}>
        {player.photo_url ? <AuctionImage src={player.photo_url} alt="" width={80} height={80} className={`${dense ? "h-10 w-10" : compactMobile ? "h-14 w-14 sm:h-20 sm:w-20" : "h-20 w-20"} shrink-0 rounded-lg border border-white/40 object-cover`} /> : <div className={`flex ${dense ? "h-10 w-10" : compactMobile ? "h-14 w-14 sm:h-20 sm:w-20" : "h-20 w-20"} shrink-0 items-center justify-center rounded-lg bg-white/15 text-2xl`} aria-hidden="true">🏏</div>}
        <div className="min-w-0 flex-1">
          <div className={`flex items-center ${dense ? "flex-wrap gap-1" : "gap-2"}`}>
            <h3 className={`min-w-0 font-black text-yellow-300 ${dense ? "break-words text-xs leading-tight [overflow-wrap:anywhere]" : "truncate text-base"}`}>{player.full_name}</h3>
            {rtmEnabled && player.status === "sold" && player.rtm_team_id && <span aria-label="Player bought through RTM" className="shrink-0 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-950">RTM</span>}
          </div>
          {showCategory && category && <p className={`mt-1 font-bold text-cyan-200 ${dense ? "break-words text-[10px] leading-tight [overflow-wrap:anywhere]" : "text-xs"}`}>Category: {category}</p>}
          {playerFields.includes("skill") && player.role && <p className={`mt-1 font-semibold ${dense ? "break-words text-[11px] leading-tight [overflow-wrap:anywhere]" : "text-sm"}`}>{player.role}</p>}
          {playerFields.includes("batting_style") && <p className={`text-xs text-white/85 ${dense ? "break-words [overflow-wrap:anywhere]" : ""}`}>{player.batting_style || "—"}</p>}
          {playerFields.includes("bowling_style") && <p className={`text-xs text-white/85 ${dense ? "break-words [overflow-wrap:anywhere]" : ""}`}>{player.bowling_style || "—"}</p>}
        </div>
      </div>
      <div className={`${dense ? "mt-1 break-words text-[10px] leading-tight [overflow-wrap:anywhere]" : compactMobile ? "mt-1 text-xs sm:mt-2" : "mt-2 text-xs"} border-t border-white/20 pt-1 font-black uppercase`}>{player.status === "sold" ? `${soldTeam?.name ?? "Team"} · ${soldPrice}` : player.status === "unsold" ? "Unsold" : "Available"}</div>
    </article>
  );
});

export default PlayerCard;
