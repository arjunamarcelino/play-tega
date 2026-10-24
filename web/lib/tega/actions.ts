"use client";

import { useCallback } from "react";
import { erc20Abi, type Address } from "viem";
import { monadTestnet } from "@/lib/monadChain";
import { tegaAbi } from "./abi";
import { TEGA_ADDRESS, USDC_ADDRESS } from "./constants";
import { useTegaTx } from "./hooks";
import { buildCommitHash, loadCommit, randomSalt32, saveCommit } from "./commit";
import type { PlayableChoice } from "./types";

const CHAIN_ID = monadTestnet.id;
const base = { address: TEGA_ADDRESS, abi: tegaAbi, chainId: CHAIN_ID } as const;

export type RevealResult = { ok: true } | { ok: false; reason: "salt-missing" };

/**
 * All Tega write actions bound to one in-flight tx (useTegaTx). Each screen
 * instantiates its own copy. `commit` generates + persists the salt (and choice)
 * so `reveal` can later auto-open from the same browser.
 */
export function useTegaActions() {
  const tx = useTegaTx();
  const { writeContract } = tx;

  const approve = useCallback(
    (stake: bigint) =>
      writeContract({ address: USDC_ADDRESS, abi: erc20Abi, chainId: CHAIN_ID, functionName: "approve", args: [TEGA_ADDRESS, stake] }),
    [writeContract],
  );

  const createMatch = useCallback(
    (invited: Address) => writeContract({ ...base, functionName: "createMatch", args: [invited] }),
    [writeContract],
  );

  const joinMatch = useCallback((id: bigint) => writeContract({ ...base, functionName: "joinMatch", args: [id] }), [writeContract]);

  const commit = useCallback(
    (id: bigint, round: number, choice: PlayableChoice, player: Address) => {
      const salt = randomSalt32();
      saveCommit(player, id, round, salt, choice);
      const hash = buildCommitHash(choice, salt, id, round, player);
      writeContract({ ...base, functionName: "commit", args: [id, hash] });
    },
    [writeContract],
  );

  const reveal = useCallback(
    (id: bigint, round: number, player: Address): RevealResult => {
      const saved = loadCommit(player, id, round);
      if (!saved) return { ok: false, reason: "salt-missing" };
      writeContract({ ...base, functionName: "reveal", args: [id, saved.choice, saved.salt] });
      return { ok: true };
    },
    [writeContract],
  );

  const poke = useCallback((id: bigint) => writeContract({ ...base, functionName: "poke", args: [id] }), [writeContract]);
  const claim = useCallback((id: bigint) => writeContract({ ...base, functionName: "claim", args: [id] }), [writeContract]);
  const cancel = useCallback((id: bigint) => writeContract({ ...base, functionName: "cancel", args: [id] }), [writeContract]);

  return { tx, approve, createMatch, joinMatch, commit, reveal, poke, claim, cancel };
}
