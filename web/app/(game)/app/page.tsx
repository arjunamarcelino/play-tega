"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { decodeEventLog, isAddress, zeroAddress, type Address } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { monadTestnet } from "@/lib/monadChain";
import { Button, Chip, Panel } from "@/components/ui";
import { AssetImg } from "@/components/AssetImg";
import { assets } from "@/lib/assets";
import { tegaAbi } from "@/lib/tega/abi";
import { FAUCET_URL, HAS_FAUCET, IS_TEGA_CONFIGURED, TEGA_ADDRESS, explorerAddress } from "@/lib/tega/constants";
import { useStake, useStakeFlow, useUsdcBalance, useUsdcAllowance, describeError } from "@/lib/tega/hooks";
import { useTegaActions } from "@/lib/tega/actions";
import { useMyMatches } from "@/lib/tega/useMyMatches";
import { useMatch } from "@/lib/tega/hooks";
import { rememberMatchId } from "@/lib/tega/matchIndex";
import { CURRENCY, fmtUsdc } from "@/lib/tega/format";
import { PHASE_LABEL, Phase } from "@/lib/tega/types";

type Via = "open" | "challenge" | "join";
type Intent = { action: "create"; invited: Address } | { action: "join"; id: bigint };
// A single click may need two txs (approve → act). `phase` tracks which one is in flight.
type Pending = null | { via: Via; intent: Intent; phase: "approving" | "acting" };

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
  const [copied, setCopied] = useState(false);

  const copyAddr = () => {
    if (!address) return;
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

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

  function fireIntent(intent: Intent) {
    if (intent.action === "create") createMatch(intent.invited);
    else joinMatch(intent.id);
  }

  // Start an action. Approval is implicit: if the allowance is short we send the
  // approve first, then fire the real tx when it confirms (no dedicated button).
  function start(via: Via, intent: Intent) {
    setErr("");
    if (flow.needsApproval) {
      if (liveStake === undefined) return;
      setPending({ via, intent, phase: "approving" });
      approve(liveStake);
    } else {
      setPending({ via, intent, phase: "acting" });
      fireIntent(intent);
    }
  }

  // Drive the two-step flow: approve confirmed → fire the real tx; act confirmed → navigate.
  useEffect(() => {
    if (!tx.isConfirmed || !tx.receipt || !pending || !address) return;
    if (pending.phase === "approving") {
      allowance.refetch();
      const { via, intent } = pending;
      setPending({ via, intent, phase: "acting" });
      tx.reset();
      fireIntent(intent);
      return;
    }
    // acting
    const { intent } = pending;
    if (intent.action === "create") {
      const id = decodeCreatedId(tx.receipt.logs);
      if (id !== null) {
        rememberMatchId(address, id);
        router.push(`/play/${id.toString()}`);
      } else {
        setErr("Match created, but could not read its id from the receipt. Check the lobby list.");
      }
    } else {
      rememberMatchId(address, intent.id);
      router.push(`/play/${intent.id.toString()}`);
    }
    setPending(null);
    tx.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx.isConfirmed, tx.receipt]);

  function doCreateOpen() {
    start("open", { action: "create", invited: zeroAddress });
  }
  function doChallenge() {
    const t = invite.trim();
    if (!isAddress(t)) return setErr("Enter a valid player address.");
    if (address && t.toLowerCase() === address.toLowerCase()) return setErr("You can't challenge yourself.");
    start("challenge", { action: "create", invited: t });
  }
  function doJoin() {
    const id = parseId(code);
    if (id === null) return setErr("Enter a numeric match id.");
    start("join", { action: "join", id });
  }

  // Per-button busy label (shows the approve step so the double-signature isn't a surprise).
  function label(via: Via, idle: string) {
    if (!busy || pending?.via !== via) return idle;
    return pending.phase === "approving" ? "Approving…" : via === "join" ? "Joining…" : "Creating…";
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="display text-3xl font-black tracking-wide">LOBBY</h1>
        <p className="mt-1 text-sm text-white/55">
          Stake per match: <span className="neon-gold display">{fmtUsdc(liveStake)} {CURRENCY}</span>
        </p>
        {IS_TEGA_CONFIGURED && (
          <div className="mt-1 text-xs text-white/40">
            Contract:{" "}
            <a href={explorerAddress(TEGA_ADDRESS)} target="_blank" rel="noopener noreferrer" className="font-mono text-mon hover:underline">
              {TEGA_ADDRESS.slice(0, 10)}…{TEGA_ADDRESS.slice(-4)} ↗
            </a>
          </div>
        )}
        {isConnected && address && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/40">
            <span>Your address:</span>
            <code className="rounded bg-black/40 px-2 py-0.5 text-white/70">{address.slice(0, 10)}…{address.slice(-4)}</code>
            <button onClick={copyAddr} className="text-mon hover:underline">{copied ? "copied!" : "copy"}</button>
            <span className="text-white/30">— share it so someone can challenge you</span>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/40">
          <span>Balance:</span>
          <span className="display neon-gold">{fmtUsdc(bal)} {CURRENCY}</span>
          {HAS_FAUCET && (
            <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="text-mon hover:underline">
              Mint USDC ↗
            </a>
          )}
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
              {HAS_FAUCET && (
                <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer">
                  <Button variant="gold">Mint test USDC ↗</Button>
                </a>
              )}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <Panel>
              <h2 className="display text-lg font-bold">New match</h2>
              <p className="mt-1 text-sm text-white/55">
                Open a table and share the match id, or challenge a specific address. Each side escrows the stake on join —
                your wallet approves it the first time automatically.
              </p>

              <div className="mt-4 flex flex-col gap-3">
                <Button variant="primary" disabled={writesBlocked || !hasStake} onClick={doCreateOpen}>
                  {label("open", "＋ Create open table")}
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
                      {label("challenge", "⚔️ Challenge")}
                    </Button>
                  </div>
                </div>
              </div>
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
                <Button variant="bagi" disabled={writesBlocked || !hasStake} onClick={doJoin}>
                  {label("join", "Join")}
                </Button>
              </div>
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

          {/* Coming-soon modes */}
          <div className="mt-12">
            <h2 className="display mb-3 text-sm uppercase tracking-[0.3em] text-white/45">More modes · coming soon</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: "👥", img: assets.mode.mass, t: "Mass Jackpot", d: "Whole room, one shared round." },
                { icon: "🏆", img: assets.mode.tournament, t: "Tournaments", d: "Brackets, seeding, grand final." },
                { icon: "🐍", img: assets.mode.snake, t: "Snake Score", d: "On-chain trust reputation & ranks." },
                { icon: "🎨", img: assets.mode.cosmetics, t: "Cosmetics", d: "Card skins, avatars, taunts." },
              ].map((m) => (
                <div key={m.t} className="panel relative p-5 opacity-70">
                  <span className="chip display absolute right-3 top-3 text-[10px] neon-gold">Soon</span>
                  <AssetImg src={m.img} alt="" className="h-8 w-8 object-contain" fallback={<div className="text-2xl">{m.icon}</div>} />
                  <div className="display mt-2 font-bold">{m.t}</div>
                  <div className="mt-1 text-xs text-white/50">{m.d}</div>
                </div>
              ))}
            </div>
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
  const { tx, approve, joinMatch } = useTegaActions();
  const stake = useStake();
  const liveStake = stake.data as bigint | undefined;
  const flow = useStakeFlow(liveStake);
  const [phase, setPhase] = useState<null | "approving" | "joining">(null);

  // Accept → approve first if needed, then join; navigate once the join confirms.
  useEffect(() => {
    if (!tx.isConfirmed || !me) return;
    if (phase === "approving") {
      flow.refetchAllowance();
      setPhase("joining");
      tx.reset();
      joinMatch(id);
      return;
    }
    if (phase === "joining") {
      rememberMatchId(me, id);
      router.push(`/play/${id.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx.isConfirmed]);

  function accept() {
    if (flow.needsApproval) {
      if (liveStake === undefined) return;
      setPhase("approving");
      approve(liveStake);
    } else {
      setPhase("joining");
      joinMatch(id);
    }
  }

  // Only a still-open invite addressed to me is actionable.
  if (!match || match.phase !== Phase.WaitP2 || !me || match.invited.toLowerCase() !== me.toLowerCase()) return null;

  const busy = tx.isPending || tx.isMining;
  return (
    <div className="panel flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-white/70">
          <code className="text-mon">{match.p1.slice(0, 8)}…{match.p1.slice(-4)}</code> challenged you
        </span>
        <span className="display text-sm tracking-widest text-white/50">#{id.toString()}</span>
      </div>
      <Button variant="bagi" disabled={disabled || busy} onClick={accept}>
        {busy ? (phase === "approving" ? "Approving…" : "Joining…") : "Accept"}
      </Button>
    </div>
  );
}
