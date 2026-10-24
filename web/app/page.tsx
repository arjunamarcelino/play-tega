"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-6xl font-bold tracking-tight">TEGA</h1>
      <p className="text-lg text-neutral-500">
        Berani khianat? — on-chain trust game on Monad.
      </p>
      <p className="text-sm text-neutral-400">Scaffold online · Monad testnet (10143)</p>
      <ConnectButton />
    </main>
  );
}
