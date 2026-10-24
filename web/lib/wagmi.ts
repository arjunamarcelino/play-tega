import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { monadTestnet } from "./monadChain";

// NOTE: getDefaultConfig comes from RainbowKit, whose entry is a "use client"
// module. This config is therefore imported ONLY from the client Providers
// component (never from a Server Component), otherwise the import resolves to a
// client-reference stub and `getDefaultConfig` is "not a function" at build time.
//
// getDefaultConfig REQUIRES a non-empty WalletConnect/Reown projectId (free at
// cloud.reown.com) — it throws otherwise, even during build/prerender. We fall back
// to a placeholder so the scaffold builds and renders with injected/MetaMask wallets;
// set a real id in .env to enable WalletConnect-based wallets.
export const config = getDefaultConfig({
  appName: "TEGA",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "tega_placeholder_projectid",
  chains: [monadTestnet],
  ssr: true,
});
