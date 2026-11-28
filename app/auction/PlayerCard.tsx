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

const PlayerCard = memo(function PlayerCard({ player, teams, rtmEnabled, playerFields, showCategory }: {
  player: Player;
  teams: { id: string; name: string }[];
  rtmEnabled: boolean;
  playerFields: ProjectorPlayerField[];
  showCategory: boolean;
}) {
  const soldTeam = teams.find((item) => item.id === player.sold_team_id);
  const category = displayPlayerCategory(player.category);
  const soldPrice = player.sold_price === null || player.sold_price === undefined ? "—" : Number(player.sold_price).toLocaleString("en-IN");
  return (
    <article className={`relative min-h-36 overflow-hidden rounded-xl border p-3 shadow-md backdrop-blur-sm ${player.status === "sold" ? "border-green-400/60 bg-gradient-to-r from-green-900/80 to-slate-900/75 text-white" : player.status === "unsold" ? "border-red-300/70 bg-gradient-to-r from-red-900/75 to-slate-900/75 text-white" : "border-white/30 bg-slate-950/55 text-white"}`}>
      <span className={`absolute left-0 top-0 rounded-br-lg px-2 py-1 text-xs font-black ${player.status === "sold" ? "bg-green-500" : player.status === "unsold" ? "bg-red-400 text-red-950" : "bg-slate-300 text-slate-900"}`}>#{player.player_number}</span>
      <div className="flex gap-3 pt-2">
        {player.photo_url ? <AuctionImage src={player.photo_url} alt="" width={80} height={80} className="h-20 w-20 shrink-0 rounded-lg border border-white/40 object-cover" /> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-white/15 text-2xl" aria-hidden="true">🏏</div>}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 truncate text-base font-black text-yellow-300">{player.full_name}</h3>
            {rtmEnabled && player.status === "sold" && player.rtm_team_id && <span aria-label="Player bought through RTM" className="shrink-0 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-950">RTM</span>}
          </div>
          {showCategory && category && <p className="mt-1 text-xs font-bold text-cyan-200">Category: {category}</p>}
          {playerFields.includes("skill") && player.role && <p className="mt-1 text-sm font-semibold">{player.role}</p>}
          {playerFields.includes("batting_style") && <p className="text-xs text-white/85">{player.batting_style || "—"}</p>}
          {playerFields.includes("bowling_style") && <p className="text-xs text-white/85">{player.bowling_style || "—"}</p>}
        </div>
      </div>
      <div className="mt-2 border-t border-white/20 pt-1 text-xs font-black uppercase">{player.status === "sold" ? `${soldTeam?.name ?? "Team"} · ${soldPrice}` : player.status === "unsold" ? "Unsold" : "Available"}</div>
    </article>
  );
});

export default PlayerCard;
