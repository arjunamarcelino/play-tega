"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { decodeEventLog, isAddress, zeroAddress, type Address } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { monadTestnet } from "@/lib/monadChain";
import { Button, Chip, Panel } from "@/components/ui";
import { tegaAbi } from "@/lib/tega/abi";
import { FAUCET_URL, IS_TEGA_CONFIGURED, TEGA_ADDRESS } from "@/lib/tega/constants";
import { useStake, useStakeFlow, useUsdcBalance, useUsdcAllowance, describeError } from "@/lib/tega/hooks";
import { useTegaActions } from "@/lib/tega/actions";
import { useMyMatches } from "@/lib/tega/useMyMatches";
import { useMatch } from "@/lib/tega/hooks";
import { rememberMatchId } from "@/lib/tega/matchIndex";
import { CURRENCY, fmtUsdc } from "@/lib/tega/format";
import { PHASE_LABEL, Phase } from "@/lib/tega/types";

type Pending = null | { kind: "approve" } | { kind: "create" } | { kind: "join"; id: bigint };

function parseId(s: string): bigint | null {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return null;
  try {
    return BigInt(t);
  } catch {
    return null;
  }
}

function decodeCreatedId(logs: readonly { address: string; topics: readonly `0x${string}`[]; data: `0x${string}` }[]): bigint | null {
  for (const log of logs) {
    if (log.address.toLowerCase() !== TEGA_ADDRESS.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({ abi: tegaAbi, topics: log.topics as [`0x${string}`, ...`0x${string}`[]], data: log.data });
      if (ev.eventName === "MatchCreated") return (ev.args as { id: bigint }).id;
    } catch {
      /* not our event */
    }
  }
  return null;
}

export default function Lobby() {
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const [invite, setInvite] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [pending, setPending] = useState<Pending>(null);

  const stake = useStake();
  const liveStake = stake.data as bigint | undefined;
  const balance = useUsdcBalance(address);
  const allowance = useUsdcAllowance(address);
  const flow = useStakeFlow(liveStake);
  const { myIds, challengeIds } = useMyMatches(address);

  const { tx, approve, createMatch, joinMatch } = useTegaActions();

  const wrongChain = isConnected && chainId !== monadTestnet.id;
  const bal = balance.data as bigint | undefined;
  const hasStake = liveStake !== undefined && bal !== undefined && bal >= liveStake;
  const busy = tx.isPending || tx.isMining;
  const writesBlocked = !isConnected || wrongChain || !IS_TEGA_CONFIGURED || busy;

  // Resolve a confirmed tx to its follow-up (navigate / refetch allowance).
  useEffect(() => {
    if (!tx.isConfirmed || !tx.receipt || !pending || !address) return;
    if (pending.kind === "approve") {
      allowance.refetch();
    } else if (pending.kind === "create") {
      const id = decodeCreatedId(tx.receipt.logs);
      if (id !== null) {
        rememberMatchId(address, id);
        router.push(`/play/${id.toString()}`);
      } else {
        setErr("Match created, but could not read its id from the receipt. Check the lobby list.");
      }
    } else if (pending.kind === "join") {
      rememberMatchId(address, pending.id);
      router.push(`/play/${pending.id.toString()}`);
    }
    setPending(null);
    tx.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx.isConfirmed, tx.receipt]);

  function doApprove() {
    if (liveStake === undefined) return;
    setErr("");
    setPending({ kind: "approve" });
    approve(liveStake);
  }
  function doCreate(invited: Address) {
    setErr("");
    setPending({ kind: "create" });
    createMatch(invited);
  }
  function doCreateOpen() {
    doCreate(zeroAddress);
  }
  function doChallenge() {
    const t = invite.trim();
    if (!isAddress(t)) return setErr("Enter a valid player address.");
    if (address && t.toLowerCase() === address.toLowerCase()) return setErr("You can't challenge yourself.");
    doCreate(t);
  }
  function doJoin() {
    const id = parseId(code);
    if (id === null) return setErr("Enter a numeric match id.");
    setErr("");
    setPending({ kind: "join", id });
    joinMatch(id);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="display text-3xl font-black tracking-wide">LOBBY</h1>
        <p className="mt-1 text-sm text-white/55">
          Stake per match: <span className="neon-gold display">{fmtUsdc(liveStake)} {CURRENCY}</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/40">
          <span>Balance:</span>
          <span className="display neon-gold">{fmtUsdc(bal)} {CURRENCY}</span>
          <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="text-mon hover:underline">
            Mint USDC ↗
          </a>
          <span className="text-white/30">· Allowance: {fmtUsdc(allowance.data as bigint | undefined)}</span>
        </div>
      </div>

      {!IS_TEGA_CONFIGURED ? (
        <Panel className="border-embat/50">
          <p className="neon-embat display text-sm">NEXT_PUBLIC_CONTRACT_ADDRESS is not set — the game is disabled.</p>
        </Panel>
      ) : !isConnected ? (
        <Panel>
          <p className="text-sm text-white/70">Connect a wallet (top-right) to create or join a match.</p>
        </Panel>
      ) : wrongChain ? (
        <Panel className="border-embat/50">
          <p className="neon-embat display mb-2 text-sm">Wrong network.</p>
          <Button variant="embat" onClick={() => switchChain({ chainId: monadTestnet.id })}>
            Switch to Monad testnet
          </Button>
        </Panel>
      ) : (
        <>
          {!hasStake && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/50 bg-gold/10 px-4 py-3">
              <span className="text-sm text-white/80">You need at least {fmtUsdc(liveStake)} {CURRENCY} to play.</span>
              <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer">
                <Button variant="gold">Mint test USDC ↗</Button>
              </a>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <Panel>
              <h2 className="display text-lg font-bold">New match</h2>
              <p className="mt-1 text-sm text-white/55">
                Open a table and share the match id, or challenge a specific address. Each side escrows the stake on join.
              </p>

              {flow.needsApproval ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs text-white/50">First, approve the contract to pull your {fmtUsdc(liveStake)} {CURRENCY} stake.</p>
                  <Button variant="gold" className="w-full" disabled={writesBlocked || !hasStake || liveStake === undefined} onClick={doApprove}>
                    {busy && pending?.kind === "approve" ? "Approving…" : `Approve ${fmtUsdc(liveStake)} ${CURRENCY}`}
                  </Button>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  <Button variant="primary" disabled={writesBlocked || !hasStake} onClick={doCreateOpen}>
                    {busy && pending?.kind === "create" ? "Creating…" : "＋ Create open table"}
                  </Button>
                  <div className="mt-1 border-t border-white/10 pt-3">
                    <div className="mb-2 text-xs uppercase tracking-widest text-white/40">Challenge a specific player</div>
                    <div className="flex gap-2">
                      <input
                        value={invite}
                        onChange={(e) => {
                          setInvite(e.target.value);
                          setErr("");
                        }}
                        placeholder="0x… player address"
                        className="w-full rounded-xl border border-mon/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-mon"
                      />
                      <Button variant="embat" disabled={writesBlocked || !hasStake} onClick={doChallenge}>
                        ⚔️ Challenge
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Panel>

            <Panel>
              <h2 className="display text-lg font-bold">Join a table</h2>
              <p className="mt-1 text-sm text-white/55">Enter the match id you were given.</p>
              <div className="mt-4 flex gap-2">
                <input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/[^\d]/g, ""));
                    setErr("");
                  }}
                  placeholder="123"
                  inputMode="numeric"
                  className="display w-full rounded-xl border border-mon/40 bg-black/40 px-4 py-3 text-lg tracking-[0.3em] outline-none focus:border-mon"
                />
                <Button variant="bagi" disabled={writesBlocked || !hasStake || flow.needsApproval} onClick={doJoin}>
                  {busy && pending?.kind === "join" ? "Joining…" : "Join"}
                </Button>
              </div>
              {flow.needsApproval && <p className="mt-2 text-xs text-white/40">Approve your stake (left) before joining.</p>}
              {err && <p className="mt-2 text-sm text-embat">{err}</p>}
              {tx.error && <p className="mt-2 text-sm text-embat">{describeError(tx.error)}</p>}
            </Panel>
          </div>

          {challengeIds.length > 0 && (
            <div className="mt-10">
              <h2 className="display mb-3 text-sm uppercase tracking-[0.3em] neon-embat animate-pulseGlow">⚔️ Incoming challenges</h2>
              <div className="flex flex-col gap-2">
                {challengeIds.map((id) => (
                  <ChallengeRow key={id.toString()} id={id} me={address} disabled={writesBlocked || !hasStake} />
                ))}
              </div>
            </div>
          )}

          <div className="mt-10">
            <h2 className="display mb-3 text-sm uppercase tracking-[0.3em] text-white/45">Your matches</h2>
            {myIds.length === 0 ? (
              <p className="text-sm text-white/40">No matches yet — start one above.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {myIds.map((id) => (
                  <MatchRow key={id.toString()} id={id} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MatchRow({ id }: { id: bigint }) {
  const { match } = useMatch(id);
  return (
    <div className="panel flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="display text-lg tracking-widest neon-mon">#{id.toString()}</span>
        {match && <Chip>{PHASE_LABEL[match.phase]}</Chip>}
        {match && (match.phase === Phase.Commit || match.phase === Phase.Reveal) && (
          <span className="text-xs text-white/50">Round {match.round}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Link href={`/play/${id.toString()}`} className="display rounded-lg border border-mon/50 px-3 py-1.5 text-xs uppercase tracking-widest text-[#d9d0ff] hover:bg-mon/20">
          Play
        </Link>
        <Link href={`/spectator/${id.toString()}`} className="display rounded-lg border border-white/15 px-3 py-1.5 text-xs uppercase tracking-widest text-white/60 hover:bg-white/10">
          Watch
        </Link>
      </div>
    </div>
  );
}

function ChallengeRow({ id, me, disabled }: { id: bigint; me: Address | undefined; disabled: boolean }) {
  const router = useRouter();
  const { match } = useMatch(id);
  const { tx, joinMatch } = useTegaActions();

  useEffect(() => {
    if (tx.isConfirmed && me) {
      rememberMatchId(me, id);
      router.push(`/play/${id.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx.isConfirmed]);

  // Only a still-open invite addressed to me is actionable.
  if (!match || match.phase !== Phase.WaitP2 || !me || match.invited.toLowerCase() !== me.toLowerCase()) return null;

  return (
    <div className="panel flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-white/70">
          <code className="text-mon">{match.p1.slice(0, 8)}…{match.p1.slice(-4)}</code> challenged you
        </span>
        <span className="display text-sm tracking-widest text-white/50">#{id.toString()}</span>
      </div>
      <Button variant="bagi" disabled={disabled || tx.isPending || tx.isMining} onClick={() => joinMatch(id)}>
        {tx.isPending || tx.isMining ? "Joining…" : "Accept"}
      </Button>
    </div>
  );
}
