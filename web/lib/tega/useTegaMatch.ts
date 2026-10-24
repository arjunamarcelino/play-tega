"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zeroHash, type Address } from "viem";
import { useWatchContractEvent } from "wagmi";
import { monadTestnet } from "@/lib/monadChain";
import { tegaAbi } from "./abi";
import { IS_TEGA_CONFIGURED, TEGA_ADDRESS } from "./constants";
import { useJackpot, useMatch } from "./hooks";
import { roundKey, type RoundResult } from "./events";
import { Choice, Phase, toChoice, type Match } from "./types";
import { useReadContract } from "wagmi";

const CHAIN_ID = monadTestnet.id;
const EVENT_POLL_MS = 2000;
const READ_POLL_MS = 2500;

// Broad view of a decoded Tega event's args — the ABI is trusted, so the event
// dispatcher reads fields by name rather than fighting the per-event union.
type EventArgs = {
  id?: bigint;
  round?: number;
  who?: Address;
  p2?: Address;
  c1?: number;
  c2?: number;
  d1?: bigint;
  d2?: bigint;
  score1?: bigint;
  score2?: bigint;
  endedRandom?: boolean;
  amount?: bigint;
};

export type Claim = { who: Address; amount: bigint };

export type TegaMatchState = {
  match: Match | undefined;
  jackpot: bigint | undefined;
  history: RoundResult[];
  endedRandom: boolean;
  lastClaim: Claim | null;
  committed: { p1: boolean; p2: boolean };
  revealed: { p1: boolean; p2: boolean };
  secondsLeft: number;
  mounted: boolean;
  isLoading: boolean;
  refetch: () => void;
};

/**
 * Drives a single match's UI from the chain: authoritative state via `matches(id)`
 * + direct `commitOf`/`revealOf` reads (refresh-safe), with live `watchContractEvent`
 * layered on top for snappy history, reveal-flip and claim updates. History is captured
 * from events observed while the page is open (per-round, deduped).
 */
export function useTegaMatch(id: bigint | undefined): TegaMatchState {
  const enabled = IS_TEGA_CONFIGURED && id !== undefined;
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [endedRandom, setEndedRandom] = useState(false);
  const [lastClaim, setLastClaim] = useState<Claim | null>(null);

  useEffect(() => setMounted(true), []);

  // Reset derived state when switching matches.
  useEffect(() => {
    setHistory([]);
    setEndedRandom(false);
    setLastClaim(null);
  }, [id]);

  const matchRead = useMatch(id);
  const match = matchRead.match;
  const jackpotRead = useJackpot();

  // Keep authoritative reads fresh without waiting on an event.
  useEffect(() => {
    if (!enabled) return;
    const iv = setInterval(() => matchRead.refetch(), READ_POLL_MS);
    return () => clearInterval(iv);
  }, [enabled, matchRead]);

  const p1 = match?.p1;
  const p2 = match?.p2 && match.p2 !== "0x0000000000000000000000000000000000000000" ? match.p2 : undefined;
  const round = match?.round ?? 0;
  const phase = match?.phase;

  // Per-round commit/reveal keys — recomputed each round so reads reflect the live round.
  const kP1 = useMemo(() => (id !== undefined && p1 && round >= 1 ? roundKey(id, round, p1) : undefined), [id, p1, round]);
  const kP2 = useMemo(() => (id !== undefined && p2 && round >= 1 ? roundKey(id, round, p2) : undefined), [id, p2, round]);

  const read = { address: TEGA_ADDRESS, abi: tegaAbi, chainId: CHAIN_ID } as const;
  const inCommit = phase === Phase.Commit;
  const inReveal = phase === Phase.Reveal;

  const commitP1 = useReadContract({ ...read, functionName: "commitOf", args: kP1 ? [kP1] : undefined, query: { enabled: enabled && inCommit && Boolean(kP1), refetchInterval: READ_POLL_MS } });
  const commitP2 = useReadContract({ ...read, functionName: "commitOf", args: kP2 ? [kP2] : undefined, query: { enabled: enabled && inCommit && Boolean(kP2), refetchInterval: READ_POLL_MS } });
  const revealP1 = useReadContract({ ...read, functionName: "revealOf", args: kP1 ? [kP1] : undefined, query: { enabled: enabled && inReveal && Boolean(kP1), refetchInterval: READ_POLL_MS } });
  const revealP2 = useReadContract({ ...read, functionName: "revealOf", args: kP2 ? [kP2] : undefined, query: { enabled: enabled && inReveal && Boolean(kP2), refetchInterval: READ_POLL_MS } });

  const refetchRoundReads = useCallback(() => {
    commitP1.refetch();
    commitP2.refetch();
    revealP1.refetch();
    revealP2.refetch();
  }, [commitP1, commitP2, revealP1, revealP2]);

  // Single watcher for ALL Tega events (no eventName) — one getLogs poll per interval.
  useWatchContractEvent({
    address: TEGA_ADDRESS,
    abi: tegaAbi,
    chainId: CHAIN_ID,
    enabled,
    poll: true,
    pollingInterval: EVENT_POLL_MS,
    onLogs(logs) {
      let touched = false;
      for (const log of logs) {
        const name = (log as { eventName?: string }).eventName;
        const a = ((log as { args?: EventArgs }).args ?? {}) as EventArgs;
        if (a.id === undefined || a.id !== id) continue;
        touched = true;
        switch (name) {
          case "RoundResolved":
            if (a.round !== undefined && a.c1 !== undefined && a.c2 !== undefined && a.d1 !== undefined && a.d2 !== undefined) {
              const entry: RoundResult = { round: a.round, c1: toChoice(a.c1), c2: toChoice(a.c2), d1: a.d1, d2: a.d2 };
              setHistory((prev) => (prev.some((h) => h.round === entry.round) ? prev : [...prev, entry].sort((x, y) => x.round - y.round)));
            }
            break;
          case "GameEnded":
            if (a.endedRandom !== undefined) setEndedRandom(a.endedRandom);
            break;
          case "Claimed":
            if (a.who && a.amount !== undefined) setLastClaim({ who: a.who, amount: a.amount });
            break;
        }
      }
      if (touched) {
        matchRead.refetch();
        refetchRoundReads();
      }
    },
  });

  // 1Hz-ish clock for the countdown.
  useEffect(() => {
    if (!enabled) return;
    setNow(Math.floor(Date.now() / 1000));
    const iv = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 500);
    return () => clearInterval(iv);
  }, [enabled]);

  const isNonZeroHash = (h: unknown): boolean => typeof h === "string" && h !== zeroHash;
  const isRevealed = (c: unknown): boolean => c !== undefined && toChoiceSafe(c) !== Choice.None;

  // In Reveal the contract guarantees both committed; otherwise rely on the reads.
  const committed = {
    p1: inReveal || isNonZeroHash(commitP1.data),
    p2: inReveal || isNonZeroHash(commitP2.data),
  };
  const revealed = {
    p1: isRevealed(revealP1.data),
    p2: isRevealed(revealP2.data),
  };

  const secondsLeft = match && (inCommit || inReveal) ? Math.max(0, Number(match.deadline) - now) : 0;

  return {
    match,
    jackpot: jackpotRead.data as bigint | undefined,
    history,
    endedRandom,
    lastClaim,
    committed,
    revealed,
    secondsLeft,
    mounted,
    isLoading: matchRead.isLoading,
    refetch: matchRead.refetch,
  };
}

function toChoiceSafe(c: unknown): Choice {
  try {
    return toChoice(c as number | bigint);
  } catch {
    return Choice.None;
  }
}
