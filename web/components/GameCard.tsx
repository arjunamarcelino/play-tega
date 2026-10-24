"use client";

import { Choice } from "@/lib/tega/types";
import { cn } from "./ui";
import { AssetImg } from "./AssetImg";
import { assets } from "@/lib/assets";

// A 3D flip card. `revealed` controls the flip; `choice` is shown on the front.
// If card-art assets exist they fill the faces; otherwise emoji/CSS fallback.
export function GameCard({
  choice,
  revealed,
  locked,
  size = "md",
}: {
  choice: Choice;
  revealed: boolean;
  locked?: boolean;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "h-36 w-24 sm:h-52 sm:w-36 md:h-72 md:w-52" : "h-32 w-20 sm:h-40 sm:w-28 md:h-48 md:w-36";
  const isBagi = choice === Choice.Bagi;
  const isSteal = choice === Choice.Steal;
  const fill = "h-full w-full rounded-[16px] object-cover";

  return (
    <div className={cn("card3d", dim)}>
      <div className={cn("card3d-inner", revealed && "flipped")}>
        {/* back */}
        <div
          className={cn(
            "card3d-face overflow-hidden border bg-panel",
            locked ? "border-mon/70 shadow-neon-mon" : "border-white/15",
          )}
        >
          <AssetImg
            src={assets.cardBack}
            alt="card back"
            className={fill}
            fallback={
              <div className="text-center">
                <div className={cn("display text-4xl", locked ? "neon-mon animate-pulseGlow" : "text-white/30")}>
                  {locked ? "🔒" : "?"}
                </div>
                <div className="mt-2 text-[10px] uppercase tracking-widest text-white/40">
                  {locked ? "Locked" : "Waiting"}
                </div>
              </div>
            }
          />
        </div>
        {/* front */}
        <div
          className={cn(
            "card3d-face card3d-back overflow-hidden border",
            isBagi && "border-bagi/80 bg-bagi/10 shadow-neon-bagi",
            isSteal && "border-embat/80 bg-embat/10 shadow-neon-embat",
            !isBagi && !isSteal && "border-white/15 bg-panel",
          )}
        >
          {isBagi || isSteal ? (
            <AssetImg
              src={isBagi ? assets.cardBagi : assets.cardEmbat}
              alt={isBagi ? "BAGI" : "EMBAT"}
              className={fill}
              fallback={
                <div className="text-center">
                  <div className="text-5xl">{isBagi ? "🤝" : "🔪"}</div>
                  <div className={cn("display mt-2 text-lg font-black uppercase tracking-wider", isBagi ? "neon-bagi" : "neon-embat")}>
                    {isBagi ? "BAGI" : "EMBAT"}
                  </div>
                </div>
              }
            />
          ) : (
            <div className="text-5xl text-white/30">—</div>
          )}
        </div>
      </div>
    </div>
  );
}
