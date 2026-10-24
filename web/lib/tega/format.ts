import { formatUnits } from "viem";
import { USDC_DECIMALS } from "./constants";

export const CURRENCY = "USDC";

/** Format a 6-dec USDC bigint for display (fixed 2dp). `—` when undefined. */
export function fmtUsdc(v: bigint | undefined, dp = 2): string {
  if (v === undefined) return "—";
  const neg = v < 0n;
  const n = Number(formatUnits(neg ? -v : v, USDC_DECIMALS));
  return `${neg ? "-" : ""}${n.toFixed(dp)}`;
}

/** Signed delta with an explicit + for non-negatives. */
export function fmtDelta(v: bigint, dp = 2): string {
  const n = Number(formatUnits(v < 0n ? -v : v, USDC_DECIMALS));
  return `${v >= 0n ? "+" : "-"}${n.toFixed(dp)}`;
}

/** ante(r) = STAKE*r/36 — mirrors Tega.sol (integer division). */
export function anteOf(stake: bigint, round: number): bigint {
  if (round < 1) return 0n;
  return (stake * BigInt(round)) / 36n;
}

/** Pot staked into a round = 2·ante(r). */
export function potOf(stake: bigint, round: number): bigint {
  return 2n * anteOf(stake, round);
}

/** claim() payout = STAKE + score, floored at 0 (invariant: never negative at Ended). */
export function payoutOf(stake: bigint, score: bigint): bigint {
  const p = stake + score;
  return p > 0n ? p : 0n;
}
