import type { Address } from "viem";

// There's no on-chain index of "my matches" without an indexer, so we remember the
// ids a wallet creates/joins locally. Scoped per address (one browser may drive both
// sides of a match). Incoming challenges come from getLogs on the indexed `invited`
// topic (see useMyMatches) — this store is only for matches this wallet took part in.

const PREFIX = "tega:matches";
const key = (addr: Address) => `${PREFIX}:${addr.toLowerCase()}`;

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

/** Ids this wallet created/joined, newest first. */
export function loadMatchIds(addr: Address): bigint[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(key(addr));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((s): s is string => typeof s === "string").map((s) => BigInt(s));
  } catch {
    return [];
  }
}

/** Record an id for this wallet (idempotent, moved to front). */
export function rememberMatchId(addr: Address, id: bigint): void {
  if (!hasStorage()) return;
  try {
    const next = [id, ...loadMatchIds(addr).filter((x) => x !== id)].slice(0, 50);
    window.localStorage.setItem(key(addr), JSON.stringify(next.map((x) => x.toString())));
  } catch {
    /* ignore */
  }
}
