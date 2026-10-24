"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { zeroAddress } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { monadTestnet } from "@/lib/monadChain";
import { Button, Panel, Chip } from "@/components/ui";
import { Timer } from "@/components/Timer";
import { GameCard } from "@/components/GameCard";
import { Confetti } from "@/components/Confetti";
import { AssetImg } from "@/components/AssetImg";
import { AssetBg } from "@/components/AssetBg";
import { assets, avatarFor } from "@/lib/assets";
import { sfx } from "@/lib/sfx";
import { useTegaMatch } from "@/lib/tega/useTegaMatch";
import { useTegaActions } from "@/lib/tega/actions";
import { useStake, useStakeFlow, useUsdcBalance, describeError } from "@/lib/tega/hooks";
import { Choice, Phase } from "@/lib/tega/types";
import { COMMIT_WIN, REVEAL_WIN, FALLBACK_STAKE, FAUCET_URL, MIN_ROUNDS, IS_TEGA_CONFIGURED } from "@/lib/tega/constants";
import type { RoundResult } from "@/lib/tega/events";
import { CURRENCY, anteOf, potOf, payoutOf, fmtUsdc, fmtDelta } from "@/lib/tega/format";

function parseId(s: string): bigint | undefined {
  if (!/^\d+$/.test(s)) return undefined;
  try {
    return BigInt(s);
  } catch {
    return undefined;
  }
}

export default function PlayPage() {
  const params = useParams<{ matchId: string }>();
  const id = parseId(params.matchId);
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const { match, jackpot, history, endedRandom, lastClaim, committed, revealed, secondsLeft, mounted, isLoading } = useTegaMatch(id);
  const { tx, approve, joinMatch, commit, reveal, poke, claim, cancel } = useTegaActions();

  const stake = useStake();
  const liveStake = (stake.data as bigint | undefined) ?? FALLBACK_STAKE;
  const flow = useStakeFlow(stake.data as bigint | undefined);
  const balance = useUsdcBalance(address);

  const [flash, setFlash] = useState<RoundResult | null>(null);
  const [saltError, setSaltError] = useState(false);
  const shownRef = useRef(0);
  const endedRef = useRef(false);
  const tickRef = useRef(0);
  const revealTriedRef = useRef<string>("");

  // Reveal-flash: when a new resolved round arrives, flip + sting for ~2.6s.
  useEffect(() => {
    if (history.length > shownRef.current) {
      shownRef.current = history.length;
      setFlash(history[history.length - 1]);
      sfx.reveal();
      const t = setTimeout(() => setFlash(null), 2600);
      return () => clearTimeout(t);
    }
  }, [history]);

  const me = address?.toLowerCase();
  const isP1 = !!me && match?.p1.toLowerCase() === me;
  const isP2 = !!me && match?.p2 && match.p2.toLowerCase() === me;
  const iAmPlayer = isP1 || isP2;

  // Win/lose sting once, when the match ends.
  useEffect(() => {
    if (match?.phase === Phase.Ended && !endedRef.current && iAmPlayer) {
      endedRef.current = true;
      const mine = isP1 ? match.score1 : match.score2;
      const opp = isP1 ? match.score2 : match.score1;
      mine >= opp ? sfx.win() : sfx.lose();
    }
  }, [match?.phase, iAmPlayer, isP1, match]);

  // Countdown ticks in the last 5s of a commit window.
  useEffect(() => {
    if (match?.phase === Phase.Commit && secondsLeft > 0 && secondsLeft <= 5 && secondsLeft !== tickRef.current) {
      tickRef.current = secondsLeft;
      sfx.tick();
    }
  }, [secondsLeft, match?.phase]);

  // Auto-reveal: when phase flips to Reveal, open my committed choice with the stored salt.
  const myRevealed = isP1 ? revealed.p1 : revealed.p2;
  useEffect(() => {
    if (!match || match.phase !== Phase.Reveal || !iAmPlayer || !id || !address) return;
    if (myRevealed) return;
    if (tx.isPending || tx.isMining) return;
    const key = `${id.toString()}:${match.round}`;
    if (revealTriedRef.current === key) return;
    revealTriedRef.current = key;
    const res = reveal(id, match.round, address);
    if (!res.ok) setSaltError(true);
  }, [match, iAmPlayer, id, address, myRevealed, tx.isPending, tx.isMining, reveal]);

  if (!IS_TEGA_CONFIGURED) return <Center>The game is not configured (missing contract address).</Center>;
  if (id === undefined) return <Center>Invalid match id.</Center>;
  if (!mounted || isLoading) return <Center>Loading…</Center>;
  if (!match || match.p1 === zeroAddress) return <Center>Match <b className="neon-mon mx-1">#{id.toString()}</b> not found.</Center>;
  if (match.phase === Phase.Cancelled) return <Center>This table was cancelled.</Center>;

  const wrongChain = isConnected && chainId !== monadTestnet.id;
  const oppAddr = isP1 ? match.p2 : match.p1;
  const myScore = isP1 ? match.score1 : match.score2;
  const oppScore = isP1 ? match.score2 : match.score1;
  const myCommitted = isP1 ? committed.p1 : committed.p2;
  const oppCommitted = isP1 ? committed.p2 : committed.p1;
  const canBeLast = match.round >= MIN_ROUNDS;
  const busy = tx.isPending || tx.isMining;

  // ---- WaitP2 ----
  if (match.phase === Phase.WaitP2) {
    const url = typeof window !== "undefined" ? `${window.location.origin}/play/${id.toString()}` : "";
    const canJoin = isConnected && !wrongChain && !isP1 && match.p2 === zeroAddress;
    const invitedToMe = match.invited === zeroAddress || (!!me && match.invited.toLowerCase() === me);
    return (
      <div className="mx-auto max-w-lg px-6 py-12">
        <Panel className="text-center">
          <h1 className="display text-xl font-bold">{match.invited !== zeroAddress ? "Challenge sent — waiting…" : "Waiting for opponent…"}</h1>
          {match.invited !== zeroAddress && (
            <div className="mt-2 text-xs text-white/50">
              Locked to <code className="text-white/70">{match.invited.slice(0, 10)}…{match.invited.slice(-4)}</code>
            </div>
          )}
          <div className="my-6">
            <div className="text-xs uppercase tracking-widest text-white/40">Match id</div>
            <div className="display mt-1 text-6xl font-black tracking-widest neon-mon">#{id.toString()}</div>
          </div>

          {isP1 ? (
            <>
              <div className="mx-auto mb-4 w-fit rounded-xl bg-white p-3">
                <QRCodeSVG value={url} size={148} />
              </div>
              <p className="text-sm text-white/60">Share this link (or scan) to bring in the opponent:</p>
              <code className="mt-2 block break-all rounded-lg bg-black/40 px-3 py-2 text-xs text-white/70">{url}</code>
              <div className="mt-3">
                <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(url)} className="text-xs">
                  Copy link
                </Button>
              </div>
              <div className="mt-5 flex justify-center gap-3">
                <Link href={`/spectator/${id.toString()}`} className="w-full">
                  <Button variant="ghost" className="w-full">Open spectator screen</Button>
                </Link>
                <Button variant="embat" disabled={busy} onClick={() => cancel(id)}>
                  {busy ? "…" : "Cancel"}
                </Button>
              </div>
            </>
          ) : !isConnected ? (
            <p className="text-sm text-white/60">Connect your wallet (top-right) to join this table.</p>
          ) : wrongChain ? (
            <Button variant="embat" onClick={() => switchChain({ chainId: monadTestnet.id })}>Switch to Monad testnet</Button>
          ) : !invitedToMe ? (
            <p className="text-sm text-embat">This table is locked to another player.</p>
          ) : flow.needsApproval ? (
            <>
              <p className="mb-2 text-sm text-white/60">Approve your {fmtUsdc(liveStake)} {CURRENCY} stake, then join.</p>
              <Button variant="gold" className="w-full" disabled={busy} onClick={() => approve(liveStake)}>
                {busy ? "Approving…" : `Approve ${fmtUsdc(liveStake)} ${CURRENCY}`}
              </Button>
              {(balance.data as bigint | undefined) !== undefined && (balance.data as bigint) < liveStake && (
                <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs text-mon hover:underline">
                  Need test USDC? Mint ↗
                </a>
              )}
            </>
          ) : canJoin ? (
            <Button variant="bagi" className="w-full" disabled={busy} onClick={() => joinMatch(id)}>
              {busy ? "Joining…" : "Join this table"}
            </Button>
          ) : null}
          {tx.error && <p className="mt-3 text-sm text-embat">{describeError(tx.error)}</p>}
        </Panel>
      </div>
    );
  }

  // ---- Ended ----
  if (match.phase === Phase.Ended) {
    const payout = payoutOf(liveStake, myScore);
    const iWon = myScore > oppScore;
    const tie = myScore === oppScore;
    const alreadyClaimed = isP1 ? match.claimed1 : match.claimed2;
    const claimedAmt = lastClaim && me && lastClaim.who.toLowerCase() === me ? lastClaim.amount : null;
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center">
        <Panel>
          {iWon && <Confetti />}
          <AssetImg src={tie ? assets.artDraw : iWon ? assets.artWin : assets.artLose} alt="" className="mx-auto mb-3 h-28 w-auto" fallback={null} />
          {endedRandom && <div className="display mb-2 text-sm uppercase tracking-widest neon-gold animate-pulseGlow">⚡ Ended suddenly</div>}
          <h1 className="display text-4xl font-black">
            {tie ? "DRAW" : iWon ? <span className="neon-bagi">YOU WON</span> : <span className="neon-embat">YOU LOST</span>}
          </h1>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <ScoreTile name="You" score={myScore} highlight />
            <ScoreTile name="Opponent" score={oppScore} />
          </div>
          <div className="mt-6">
            {iAmPlayer ? (
              claimedAmt !== null ? (
                <div className="display text-lg neon-gold">Received {fmtUsdc(claimedAmt)} {CURRENCY}</div>
              ) : alreadyClaimed ? (
                <div className="text-sm text-white/50">Already claimed.</div>
              ) : (
                <Button variant="gold" disabled={busy} onClick={() => claim(id)}>
                  {busy ? "Claiming…" : `Claim ${fmtUsdc(payout)} ${CURRENCY}`}
                </Button>
              )
            ) : (
              <div className="text-sm text-white/50">Spectating — nothing to claim.</div>
            )}
            {tx.error && <p className="mt-3 text-sm text-embat">{describeError(tx.error)}</p>}
          </div>
          <History history={history} />
          <Link href="/app" className="mt-6 inline-block text-xs uppercase tracking-widest text-white/40 hover:text-white/70">← back to lobby</Link>
        </Panel>
      </div>
    );
  }

  // ---- Commit / Reveal ----
  const timedOut = secondsLeft <= 0;
  const myCardChoice = flash ? (isP1 ? flash.c1 : flash.c2) : Choice.None;
  const oppCardChoice = flash ? (isP1 ? flash.c2 : flash.c1) : Choice.None;
  const myDelta = flash ? (isP1 ? flash.d1 : flash.d2) : 0n;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Chip className="neon-mon">Round {match.round}</Chip>
          <Chip>Ante {fmtUsdc(anteOf(liveStake, match.round))} {CURRENCY}</Chip>
          <Chip className="neon-gold">Pot {fmtUsdc(potOf(liveStake, match.round))}</Chip>
          {jackpot !== undefined && jackpot > 0n && <Chip className="neon-gold">Jackpot {fmtUsdc(jackpot)}</Chip>}
        </div>
        <Link href={`/spectator/${id.toString()}`} className="text-xs uppercase tracking-widest text-white/40 hover:text-white/70">
          spectator view ↗
        </Link>
      </div>

      {canBeLast && (
        <div className="mb-5 rounded-xl border border-gold/40 bg-gold/5 px-4 py-2 text-center text-sm neon-gold animate-pulseGlow">
          ⚠️ This could be the LAST round (25% chance)
        </div>
      )}

      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen px-4 sm:px-6">
        <Panel className="relative overflow-hidden hud-grid">
          <AssetBg src={assets.arenaBg} opacity={0.2} />
          <div className="relative flex items-center justify-around gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-3">
              <ScoreTile name="You" score={myScore} addr={address ?? undefined} highlight compact />
              <GameCard choice={myCardChoice} revealed={!!flash} locked={myCommitted && !flash} size="lg" />
            </div>
            <div className="display text-xl font-black text-white/30 sm:text-3xl">VS</div>
            <div className="flex flex-col items-center gap-3">
              <ScoreTile name="Opponent" score={oppScore} addr={oppAddr && oppAddr !== zeroAddress ? oppAddr : undefined} compact />
              <GameCard choice={oppCardChoice} revealed={!!flash} locked={oppCommitted && !flash} size="lg" />
            </div>
          </div>

          {flash && (
            <div className="relative mt-4 text-center text-sm">
              <span className="text-white/60">Round {flash.round}: </span>
              <span className={myDelta >= 0n ? "neon-bagi" : "neon-embat"}>
                {fmtDelta(myDelta)} {CURRENCY}
              </span>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Timer
          seconds={secondsLeft}
          total={match.phase === Phase.Commit ? COMMIT_WIN : REVEAL_WIN}
          label={match.phase === Phase.Commit ? "Choose" : "Revealing"}
        />

        {match.phase === Phase.Commit && iAmPlayer && !flash && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Button variant="bagi" className="py-6 text-lg" disabled={myCommitted || busy} onClick={() => id && address && commit(id, match.round, Choice.Bagi, address)}>
              🤝 BAGI
            </Button>
            <Button variant="embat" className="py-6 text-lg" disabled={myCommitted || busy} onClick={() => id && address && commit(id, match.round, Choice.Steal, address)}>
              🔪 EMBAT
            </Button>
          </div>
        )}
        {myCommitted && match.phase === Phase.Commit && <p className="mt-3 text-center text-sm text-white/50">🔒 Locked — waiting for opponent…</p>}
        {match.phase === Phase.Reveal && !saltError && <p className="mt-3 text-center text-sm text-white/50">Opening cards…</p>}
        {saltError && (
          <p className="mt-3 text-center text-sm text-embat">
            Salt for this round is missing from this browser — you committed elsewhere or cleared storage. You cannot reveal here; if the deadline passes, either player can force-resolve below.
          </p>
        )}
        {!iAmPlayer && <p className="mt-3 text-center text-sm text-white/50">You are spectating this match.</p>}
        {tx.error && <p className="mt-3 text-center text-sm text-embat">{describeError(tx.error)}</p>}
        {timedOut && (
          <div className="mt-3 text-center">
            <Button variant="ghost" disabled={busy} onClick={() => id && poke(id)}>
              ⏱ Force resolve (opponent stalled)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center text-white/70">
      <Panel>{children}</Panel>
    </div>
  );
}

function ScoreTile({ name, score, addr, highlight, compact }: { name: string; score: bigint; addr?: string; highlight?: boolean; compact?: boolean }) {
  return (
    <div className={compact ? "text-center" : "panel py-4"}>
      {addr && <AssetImg src={avatarFor(addr)} alt="" className="mx-auto mb-1 h-10 w-10 rounded-full object-cover ring-1 ring-white/20" fallback={null} />}
      <div className="text-xs uppercase tracking-widest text-white/45">{name}</div>
      <div className={`display font-black ${compact ? "text-xl" : "text-3xl"} ${highlight ? "neon-mon" : "text-white/80"}`}>{fmtDelta(score)}</div>
    </div>
  );
}

function History({ history }: { history: RoundResult[] }) {
  if (!history.length) return null;
  const icon = (c: Choice) => (c === Choice.Bagi ? "🤝" : c === Choice.Steal ? "🔪" : "—");
  return (
    <div className="mt-6 text-left">
      <div className="mb-2 text-xs uppercase tracking-widest text-white/40">Round history</div>
      <div className="flex flex-col gap-1 text-sm">
        {history.map((h) => (
          <div key={h.round} className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-1.5">
            <span className="text-white/50">R{h.round}</span>
            <span>{icon(h.c1)} vs {icon(h.c2)}</span>
            <span className="text-white/60">{fmtDelta(h.d1)} / {fmtDelta(h.d2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
