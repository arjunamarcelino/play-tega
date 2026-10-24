import { encodePacked, keccak256, type Address, type Hex } from "viem";
import type { Choice } from "./types";

/**
 * Reproduces Tega.sol `_key(id, r, p) = keccak256(abi.encodePacked(id, r, p))`
 * types `(uint256, uint8, address)` — the mapping key for commitOf/revealOf/saltOf.
 * Used to read a player's per-round commit/reveal state directly from the chain.
 */
export function roundKey(id: bigint, round: number, player: Address): Hex {
  return keccak256(encodePacked(["uint256", "uint8", "address"], [id, round, player]));
}

/** One resolved round, reconstructed from the RoundResolved event. Deltas are 6-dec USDC units. */
export type RoundResult = {
  round: number;
  c1: Choice;
  c2: Choice;
  d1: bigint;
  d2: bigint;
};
