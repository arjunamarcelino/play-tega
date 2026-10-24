import { defineChain } from "viem";

// Hand-rolled rather than importing viem/chains' monadTestnet, because viem's
// bundled copy may still carry the deprecated monadexplorer.com explorer URL.
// No env override: a scaffold uses the public RPC directly. (See .env.example note
// about keyed RPCs being server-side-only.)
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "MonadVision", url: "https://testnet.monadvision.com" },
  },
  testnet: true,
});
