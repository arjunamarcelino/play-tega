"use client";

import { BaseError, ContractFunctionRevertedError, erc20Abi, type Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { monadTestnet } from "@/lib/monadChain";
import { tegaAbi } from "./abi";
import { IS_TEGA_CONFIGURED, TEGA_ADDRESS, USDC_ADDRESS } from "./constants";
import { toMatch, type Match, type RawMatch } from "./types";

const CHAIN_ID = monadTestnet.id;
const read = { address: TEGA_ADDRESS, abi: tegaAbi, chainId: CHAIN_ID } as const;

// ---- reads ----

export function useStake() {
  return useReadContract({ ...read, functionName: "STAKE", query: { enabled: IS_TEGA_CONFIGURED } });
}

export function useAnte(round: number) {
  return useReadContract({
    ...read,
    functionName: "ante",
    args: [round],
    query: { enabled: IS_TEGA_CONFIGURED && round >= 1 },
  });
}

export function useJackpot() {
  return useReadContract({ ...read, functionName: "jackpot", query: { enabled: IS_TEGA_CONFIGURED } });
}

export function useTrustScore(addr?: Address) {
  return useReadContract({
    ...read,
    functionName: "trustScore",
    args: addr ? [addr] : undefined,
    query: { enabled: IS_TEGA_CONFIGURED && Boolean(addr) },
  });
}

export function useMatch(id?: bigint): { match: Match | undefined; isLoading: boolean; refetch: () => void } {
  const r = useReadContract({
    ...read,
    functionName: "matches",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: IS_TEGA_CONFIGURED && id !== undefined },
  });
  return { match: r.data ? toMatch(r.data as RawMatch) : undefined, isLoading: r.isLoading, refetch: r.refetch };
}

export function useUsdcBalance(addr?: Address) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    chainId: CHAIN_ID,
    functionName: "balanceOf",
    args: addr ? [addr] : undefined,
    query: { enabled: Boolean(addr) },
  });
}

export function useUsdcAllowance(owner?: Address) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    chainId: CHAIN_ID,
    functionName: "allowance",
    args: owner ? [owner, TEGA_ADDRESS] : undefined,
    query: { enabled: Boolean(owner) },
  });
}

// ---- writes ----
// One tx machinery; callers pass a request with a LITERAL functionName so viem/wagmi
// keep full arg + return inference (a generic `functionName: string` wrapper would not).
// Always pin chainId so writes can't target an ambient wrong chain.

export function useTegaTx() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash, chainId: CHAIN_ID });
  return {
    writeContract,
    hash,
    isPending, // awaiting wallet signature / broadcast
    isMining: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    isReverted: receipt.isError,
    error: error ?? receipt.error ?? null,
    reset,
  };
}

/** Allowance helper for the approve-before-stake flow. `needsApproval` is true until >= STAKE. */
export function useStakeFlow(stake?: bigint) {
  const { address } = useAccount();
  const allowance = useUsdcAllowance(address);
  const needsApproval = stake === undefined || allowance.data === undefined || allowance.data < stake;
  return { allowance: allowance.data, needsApproval, refetchAllowance: allowance.refetch };
}

// ---- error surfacing ----

/** Human-readable message from a wagmi/viem error — decodes the revert reason if present. */
export function describeError(err: unknown): string {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      return revert.data?.errorName ?? revert.reason ?? revert.shortMessage;
    }
    return err.shortMessage;
  }
  return err instanceof Error ? err.message : "Unknown error";
}

export { TEGA_ADDRESS, USDC_ADDRESS, tegaAbi };
