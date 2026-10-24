import { bytesToHex, encodePacked, isHex, keccak256, type Address, type Hex } from "viem";
import type { PlayableChoice } from "./types";

/**
 * Cryptographically secure 32-byte salt, 0x-prefixed. Browser-only — call from an
 * event handler (uses `crypto`), never at module scope or during SSR render.
 */
export function randomSalt32(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/**
 * Reproduces Tega.sol:193 exactly:
 * `keccak256(abi.encodePacked(choice, salt, id, round, player))`
 * types `(uint8, bytes32, uint256, uint8, address)`. The types array is kept inline
 * so viem enforces tuple order/length against the values at compile time.
 */
export function buildCommitHash(
  choice: PlayableChoice,
  salt: Hex,
  id: bigint,
  round: number,
  player: Address,
): Hex {
  if (round < 1) throw new Error(`invalid round: ${round}`);
  return keccak256(encodePacked(["uint8", "bytes32", "uint256", "uint8", "address"], [choice, salt, id, round, player]));
}

// ---- salt persistence (localStorage) ----
// The salt is published on-chain at reveal, so it's a nonce, not a secret vs the chain.
// But losing it before reveal means you cannot reveal (forfeit, spec §9 C9), and leaking
// it to the opponent before they commit breaks fairness — so never send it to logging/analytics.

const SALT_PREFIX = "tega";
const saltKey = (id: bigint, round: number) => `${SALT_PREFIX}:${id.toString()}:${round}`;

type SaltRecord = { v: 1; salt: Hex; savedAt: number };

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false; // sandboxed/blocked storage can throw on access
  }
}

/** Persist the salt for (id, round). Returns false if storage is unavailable/full. */
export function saveSalt(id: bigint, round: number, salt: Hex): boolean {
  if (!hasStorage()) return false;
  try {
    const record: SaltRecord = { v: 1, salt, savedAt: Date.now() };
    window.localStorage.setItem(saltKey(id, round), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/** Load a previously saved salt, validating shape + length. null if missing/corrupt. */
export function loadSalt(id: bigint, round: number): Hex | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(saltKey(id, round));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SaltRecord>;
    if (parsed.v === 1 && typeof parsed.salt === "string" && isHex(parsed.salt, { strict: true }) && parsed.salt.length === 66) {
      return parsed.salt;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSalt(id: bigint, round: number): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(saltKey(id, round));
  } catch {
    /* ignore */
  }
}

/** Evict tega salt records older than `maxAgeMs` (default 7 days). Call on app/debug mount. */
export function sweepStaleSalts(maxAgeMs = 7 * 24 * 60 * 60 * 1000): void {
  if (!hasStorage()) return;
  try {
    const now = Date.now();
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(`${SALT_PREFIX}:`)) continue;
      try {
        const parsed = JSON.parse(window.localStorage.getItem(key) ?? "") as Partial<SaltRecord>;
        if (parsed.v !== 1 || typeof parsed.savedAt !== "number" || now - parsed.savedAt > maxAgeMs) {
          window.localStorage.removeItem(key);
        }
      } catch {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }
}
