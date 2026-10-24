"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { Chip } from "@/components/ui";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-7 p-8 text-center">
      <Chip className="neon-mon">Monad testnet · 10143</Chip>

      <h1 className="display text-7xl font-black tracking-tight">
        <span className="neon-bagi">TE</span>
        <span className="neon-embat">GA</span>
      </h1>

      <p className="max-w-md text-lg text-white/70">
        Berani khianat? Split it, or steal it — an on-chain trust game on Monad.
      </p>

      <ConnectButton />

      <Link
        href="/app"
        className="display rounded-xl border border-mon/60 bg-panel/60 px-6 py-3 text-lg text-mon transition-all hover:border-mon hover:shadow-neon-mon"
      >
        ▶ Enter the lobby
      </Link>

      <Link href="/debug" className="display text-sm text-white/40 underline-offset-4 hover:text-white/70 hover:underline">
        Open debug console →
      </Link>
    </main>
  );
}
