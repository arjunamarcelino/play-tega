"use client";

import { useCallback, useEffect, useState } from "react";
import { getAbiItem, type Address } from "viem";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { monadTestnet } from "@/lib/monadChain";
import { tegaAbi } from "./abi";
import { IS_TEGA_CONFIGURED, TEGA_ADDRESS } from "./constants";
import { loadMatchIds } from "./matchIndex";

const CHAIN_ID = monadTestnet.id;
const MATCH_CREATED = getAbiItem({ abi: tegaAbi, name: "MatchCreated" });
// Bound the historical scan so a range-limited public RPC doesn't reject the query.
// Monad blocks are sub-second, so this still covers many hours of play.
const LOOKBACK = 200_000n;

/**
 * Lobby data with no indexer:
 *  - `myIds`     — matches this wallet created/joined (localStorage, see matchIndex).
 *  - `challengeIds` — open matches that named this wallet via the indexed `invited` topic,
 *    found by getLogs (bounded lookback) + a live watcher for ones created while open.
 */
export function useMyMatches(address: Address | undefined) {
  const client = usePublicClient({ chainId: CHAIN_ID });
  const [myIds, setMyIds] = useState<bigint[]>([]);
  const [challengeIds, setChallengeIds] = useState<bigint[]>([]);

  const refreshLocal = useCallback(() => {
    setMyIds(address ? loadMatchIds(address) : []);
  }, [address]);

  useEffect(() => {
    refreshLocal();
  }, [refreshLocal]);

  const addChallenge = useCallback(
    (id: bigint) => setChallengeIds((prev) => (prev.includes(id) ? prev : [id, ...prev])),
    [],
  );

  // Historical backfill of challenges addressed to me.
  useEffect(() => {
    let cancelled = false;
    if (!IS_TEGA_CONFIGURED || !address || !client) {
      setChallengeIds([]);
      return;
    }
    (async () => {
      try {
        const latest = await client.getBlockNumber();
        const fromBlock = latest > LOOKBACK ? latest - LOOKBACK : 0n;
        const logs = await client.getLogs({
          address: TEGA_ADDRESS,
          event: MATCH_CREATED,
          args: { invited: address },
          fromBlock,
          toBlock: latest,
        });
        if (cancelled) return;
        const ids = logs.map((l) => l.args.id).filter((x): x is bigint => x !== undefined);
        setChallengeIds((prev) => Array.from(new Set([...ids.reverse(), ...prev])));
      } catch {
        // Range-limited / unsupported RPC — live watcher below still catches new challenges.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, client]);

  // Live challenges created while the lobby is open.
  useWatchContractEvent({
    address: TEGA_ADDRESS,
    abi: tegaAbi,
    chainId: CHAIN_ID,
    eventName: "MatchCreated",
    args: address ? { invited: address } : undefined,
    enabled: IS_TEGA_CONFIGURED && Boolean(address),
    poll: true,
    pollingInterval: 3000,
    onLogs(logs) {
      for (const l of logs) {
        const id = (l as { args?: { id?: bigint } }).args?.id;
        if (id !== undefined) addChallenge(id);
      }
    },
  });

  return { myIds, challengeIds, refreshLocal };
}
