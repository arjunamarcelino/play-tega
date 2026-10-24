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

/** devnads testnet USDC (6-dec) — the staked token on Monad testnet. */
export const USDC_ADDRESS: Address = "0x56bf9CDc3C1876F3F22655a0016C2743E9e39a73";
export const USDC_DECIMALS = 6;

export const FAUCET_URL = "https://devnads.com/tokens";

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
