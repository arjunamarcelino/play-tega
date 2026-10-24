import { isAddress, zeroAddress, type Address } from "viem";

// ---- addresses ----

const envTega = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
/**
 * The deployed Tega contract. Fail-SAFE (not fail-fast): falls back to the zero
 * address when the env var is missing/malformed so the build never throws. The
 * debug page must gate writes on `IS_TEGA_CONFIGURED` and show the address.
 */
export const TEGA_ADDRESS: Address = envTega && isAddress(envTega) ? envTega : zeroAddress;
export const IS_TEGA_CONFIGURED = TEGA_ADDRESS !== zeroAddress;

/**
 * The staked token (USDC), per network — set via env so the same build targets
 * testnet or mainnet. Defaults to devnads testnet USDC when unset. Both the
 * testnet (`0x56bf…a73`) and mainnet (`0x7547…b603`) USDC are 6-dec.
 */
const envUsdc = process.env.NEXT_PUBLIC_USDC_ADDRESS;
export const USDC_ADDRESS: Address =
  envUsdc && isAddress(envUsdc) ? envUsdc : "0x56bf9CDc3C1876F3F22655a0016C2743E9e39a73";
export const USDC_DECIMALS = Number(process.env.NEXT_PUBLIC_USDC_DECIMALS ?? 6);

/**
 * Faucet URL for test USDC. FAIL-CLOSED: empty unless `NEXT_PUBLIC_FAUCET_URL` is
 * set, so production (no faucet env) shows no faucet UI, while dev/testnet opts in.
 * Gate all faucet links on `HAS_FAUCET`.
 */
export const FAUCET_URL = process.env.NEXT_PUBLIC_FAUCET_URL ?? "";
export const HAS_FAUCET = FAUCET_URL.trim() !== "";

/**
 * Block explorer base, per network (set via env). Defaults to testnet MonadVision.
 *   testnet: https://testnet.monadvision.com · mainnet: https://monadvision.com
 * Used to make the deployed contract address + tx hashes clickable.
 */
export const EXPLORER_URL = (process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://testnet.monadvision.com").replace(/\/+$/, "");
export const explorerAddress = (addr: string) => `${EXPLORER_URL}/address/${addr}`;
export const explorerTx = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;

// ---- display-only fallbacks (Tega.sol:55-60) ----
// NEVER use these in tx-building or balance math — read the live values via
// useStake()/useAnte(). They exist only to render a skeleton before chain data loads.

export const FALLBACK_STAKE = 5_000_000n; // 5 USDC
export const MAX_ROUNDS = 8;
export const MIN_ROUNDS = 3;
export const END_PROB = 25;
export const COMMIT_WIN = 15; // seconds
export const REVEAL_WIN = 10; // seconds

/** Local mirror of ante(r) = STAKE*r/36 for skeleton display only. */
export function fallbackAnte(round: number): bigint {
  return (FALLBACK_STAKE * BigInt(round)) / 36n;
}
