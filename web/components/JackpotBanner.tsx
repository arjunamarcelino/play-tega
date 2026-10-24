"use client";

import { AssetImg } from "./AssetImg";
import { assets } from "@/lib/assets";
import { useJackpot } from "@/lib/tega/hooks";
import { CURRENCY, fmtUsdc } from "@/lib/tega/format";

// Weekly-challenge pool. Reads the live on-chain `jackpot` — mutual-betrayal rounds
// (EMBAT vs EMBAT) and double-forfeits burn their pot into it (Tega.sol).
export function JackpotBanner() {
  const jackpot = useJackpot();
  const total = (jackpot.data as bigint | undefined) ?? 0n;

  return (
    <div className="relative overflow-hidden p-8 text-center">
      <div className="relative">
        <div className="chip display mb-4 inline-block neon-gold">Weekly Challenge · Coming soon</div>
        <AssetImg src={assets.jackpot} alt="" className="mx-auto mb-2 h-72 w-auto md:h-96" fallback={null} />
        <div className="text-xs uppercase tracking-[0.3em] text-white/50">This week&apos;s jackpot</div>
        <div className="display mt-2 text-5xl font-black neon-gold md:text-7xl">
          {fmtUsdc(total)} <span className="text-2xl md:text-4xl">{CURRENCY}</span>
        </div>
        <p className="mx-auto mt-4 max-w-xl text-sm text-white/60">
          Every <span className="neon-embat font-bold">mutual betrayal</span> (EMBAT vs EMBAT) burns the pot into the Weekly
          Jackpot. <span className="text-white/80">Coming soon:</span> top the <span className="neon-mon">Snake Score™</span>{" "}
          leaderboard each week to claim it.
        </p>
        <div className="mt-3 text-xs uppercase tracking-widest text-white/55">Resets every Sunday</div>
      </div>
    </div>
  );
}
