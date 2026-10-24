// Mirrors the Tega.sol enums + Match struct. Object-as-const (NOT `const enum`,
// which is incompatible with tsconfig `isolatedModules`).

/** Tega.sol:38 — enum Choice { None, Bagi, Steal }. */
export const Choice = { None: 0, Bagi: 1, Steal: 2 } as const;
export type Choice = (typeof Choice)[keyof typeof Choice]; // 0 | 1 | 2
/** The two values legal to commit/reveal (None is the uncommitted sentinel). */
export type PlayableChoice = Exclude<Choice, typeof Choice.None>; // 1 | 2

/** Tega.sol:39 — enum Phase { WaitP2, Commit, Reveal, Ended, Cancelled }. */
export const Phase = { WaitP2: 0, Commit: 1, Reveal: 2, Ended: 3, Cancelled: 4 } as const;
export type Phase = (typeof Phase)[keyof typeof Phase];

/**
 * `matches(id)`'s getter returns 10 FLAT outputs (viem decodes a positional tuple,
 * not an object). Field order matches Tega.sol:41-52. Every integer width decodes
 * as bigint in viem; only the small enum-ish `phase`/`round` are narrowed to number.
 */
export type RawMatch = readonly [
  `0x${string}`, // p1
  `0x${string}`, // p2
  `0x${string}`, // invited
  number, // phase (uint8)
  number, // round (uint8)
  bigint, // deadline (uint64)
  boolean, // claimed1
  boolean, // claimed2
  bigint, // score1 (int256)
  bigint, // score2 (int256)
];

export type Match = {
  p1: `0x${string}`;
  p2: `0x${string}`;
  invited: `0x${string}`;
  phase: Phase;
  round: number;
  deadline: bigint;
  claimed1: boolean;
  claimed2: boolean;
  score1: bigint;
  score2: bigint;
};

export function toMatch(t: RawMatch): Match {
  const [p1, p2, invited, phase, round, deadline, claimed1, claimed2, score1, score2] = t;
  return { p1, p2, invited, phase: toPhase(phase), round, deadline, claimed1, claimed2, score1, score2 };
}

/** Validated converters for untrusted on-chain values — never a blind cast. */
export function toChoice(raw: bigint | number): Choice {
  const n = Number(raw);
  if (n === Choice.None || n === Choice.Bagi || n === Choice.Steal) return n;
  throw new Error(`invalid Choice from chain: ${raw}`);
}

export function toPhase(raw: bigint | number): Phase {
  const n = Number(raw);
  if (n >= Phase.WaitP2 && n <= Phase.Cancelled) return n as Phase;
  throw new Error(`invalid Phase from chain: ${raw}`);
}

export const PHASE_LABEL: Record<Phase, string> = {
  [Phase.WaitP2]: "Waiting for P2",
  [Phase.Commit]: "Commit",
  [Phase.Reveal]: "Reveal",
  [Phase.Ended]: "Ended",
  [Phase.Cancelled]: "Cancelled",
};
