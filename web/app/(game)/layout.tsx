"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MuteButton } from "@/components/MuteButton";
import { AssetImg } from "@/components/AssetImg";
import { assets } from "@/lib/assets";
import { FAUCET_URL, HAS_FAUCET } from "@/lib/tega/constants";

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-white/10 bg-black/30 px-5 py-3 backdrop-blur md:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="TEGA home">
            <AssetImg
              src={assets.logo}
              alt="TEGA"
              className="h-6 w-auto"
              fallback={
                <span className="display text-lg font-black tracking-widest">
                  <span className="neon-bagi">TE</span>
                  <span className="neon-embat">GA</span>
                </span>
              }
            />
          </Link>
          <Link href="/app" className="text-xs uppercase tracking-widest text-white/40 hover:text-white/70">
            Lobby
          </Link>
          {HAS_FAUCET && (
            <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="text-xs uppercase tracking-widest text-white/40 hover:text-white/70">
              Mint USDC ↗
            </a>
          )}
        </div>
        <div className="flex items-center gap-3">
          <MuteButton />
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
