"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { zeroAddress } from "viem";
import { Chip } from "@/components/ui";
import { GameCard } from "@/components/GameCard";
import { Confetti } from "@/components/Confetti";
import { AssetImg } from "@/components/AssetImg";
import { AssetBg } from "@/components/AssetBg";
import { assets, avatarFor } from "@/lib/assets";
import { sfx } from "@/lib/sfx";
import { useTegaMatch } from "@/lib/tega/useTegaMatch";
import { useStake } from "@/lib/tega/hooks";
import { Choice, Phase, type Match } from "@/lib/tega/types";
import { FALLBACK_STAKE, MIN_ROUNDS, IS_TEGA_CONFIGURED } from "@/lib/tega/constants";
import type { RoundResult } from "@/lib/tega/events";
import { CURRENCY, potOf, payoutOf, fmtUsdc, fmtDelta } from "@/lib/tega/format";

function parseId(s: string): bigint | undefined {
  if (!/^\d+$/.test(s)) return undefined;
  try {
    return BigInt(s);
  } catch {
    return undefined;
  }
}

export default function Spectator() {
  const params = useParams<{ matchId: string }>();
  const id = parseId(params.matchId);
  const { match, jackpot, history, endedRandom, lastClaim, committed, mounted } = useTegaMatch(id);
  const stake = useStake();
  const liveStake = (stake.data as bigint | undefined) ?? FALLBACK_STAKE;

  const [flash, setFlash] = useState<RoundResult | null>(null);
  const shownRef = useRef(0);
  const endedRef = useRef(false);

  useEffect(() => {
    if (history.length > shownRef.current) {
      shownRef.current = history.length;
      setFlash(history[history.length - 1]);
      sfx.reveal();
      const t = setTimeout(() => setFlash(null), 2800);
      return () => clearTimeout(t);
    }
  }, [history]);

  useEffect(() => {
    if (match?.phase === Phase.Ended && !endedRef.current) {
      endedRef.current = true;
      sfx.win();
    }
  }, [match?.phase]);

  if (!IS_TEGA_CONFIGURED) return <Big>Game not configured.</Big>;
  if (id === undefined) return <Big>Invalid match id</Big>;
  if (!mounted) return <Big>Loading…</Big>;
  if (!match || match.p1 === zeroAddress) return <Big>Match #{params.matchId} not found</Big>;

  const p2 = match.p2 && match.p2 !== zeroAddress ? match.p2 : undefined;
  const s1 = match.score1;
  const s2 = match.score2;
  const live = match.phase === Phase.Commit || match.phase === Phase.Reveal;
  const canBeLast = match.round >= MIN_ROUNDS && live;
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/play/${id.toString()}` : "";

  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] flex min-h-[86vh] w-screen flex-col items-center justify-center overflow-hidden px-6 py-8">
      <AssetBg src={assets.arenaBg} opacity={0.18} fullBleed height="clamp(220px, 55vh, 520px)" />

      {/* mobile-join QR, corner */}
      {live && joinUrl && (
        <div className="absolute bottom-4 right-4 z-20 hidden rounded-lg bg-white p-2 sm:block">
          <QRCodeSVG value={joinUrl} size={72} />
          <div className="mt-1 text-center text-[9px] font-bold uppercase tracking-widest text-black/70">Join #{id.toString()}</div>
        </div>
      )}

      {lastClaim && <ClaimToast amount={lastClaim.amount} />}

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center">
        <div className="mb-6 flex items-center gap-3">
          <Chip className="neon-mon text-sm">Match #{id.toString()}</Chip>
          {live && <Chip className="neon-mon text-sm">Round {match.round}</Chip>}
          {jackpot !== undefined && jackpot > 0n && <Chip className="neon-gold text-sm">Jackpot {fmtUsdc(jackpot)} {CURRENCY}</Chip>}
        </div>

        {canBeLast && (
          <div className="mb-6 rounded-xl border border-gold/50 bg-gold/10 px-6 py-2 text-center text-lg neon-gold animate-pulseGlow">
            ⚠️ THIS COULD BE THE LAST ROUND
          </div>
        )}

        {match.phase === Phase.Ended ? (
          <Ended match={match} s1={s1} s2={s2} stake={liveStake} endedRandom={endedRandom} />
        ) : match.phase === Phase.Cancelled ? (
          <div className="display text-2xl text-white/60">This table was cancelled.</div>
        ) : match.phase === Phase.WaitP2 ? (
          <div className="text-center">
            <div className="display text-2xl text-white/60">Waiting for opponent…</div>
            <div className="display mt-4 text-8xl font-black tracking-widest neon-mon">#{id.toString()}</div>
            {joinUrl && (
              <div className="mx-auto mt-6 w-fit rounded-xl bg-white p-3">
                <QRCodeSVG value={joinUrl} size={160} />
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex w-full items-center justify-around gap-2 sm:gap-6">
              <PlayerSide addr={match.p1} score={s1} choice={flash ? flash.c1 : Choice.None} revealed={!!flash} locked={committed.p1 && !flash} color="mon" />
              <div className="display text-2xl font-black text-white/25 sm:text-5xl md:text-7xl">VS</div>
              <PlayerSide addr={p2} score={s2} choice={flash ? flash.c2 : Choice.None} revealed={!!flash} locked={committed.p2 && !flash} color="embat" />
            </div>

            <div className="mt-8 text-center">
              <div className="text-xs uppercase tracking-widest text-white/40">Pot this round</div>
              <div className="display text-3xl font-black neon-gold">{fmtUsdc(potOf(liveStake, match.round))} {CURRENCY}</div>
              <div className="mt-2 text-sm text-white/50">{match.phase === Phase.Commit ? "Players are locking in…" : "Opening cards…"}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PlayerSide({
  addr,
  score,
  choice,
  revealed,
  locked,
  color,
}: {
  addr?: string;
  score: bigint;
  choice: Choice;
  revealed: boolean;
  locked: boolean;
  color: "mon" | "embat";
}) {
  const name = addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
  return (
    <div className="flex flex-col items-center gap-4">
      {addr && <AssetImg src={avatarFor(addr)} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-white/20" fallback={null} />}
      <div className={`display text-xl font-bold ${color === "mon" ? "neon-mon" : "neon-embat"}`}>{name}</div>
      <GameCard choice={choice} revealed={revealed} locked={locked} size="lg" />
      <div className="display text-4xl font-black text-white/85">{fmtDelta(score)}</div>
    </div>
  );
}

function Ended({ match, s1, s2, stake, endedRandom }: { match: Match; s1: bigint; s2: bigint; stake: bigint; endedRandom: boolean }) {
  const p1Won = s1 > s2;
  const tie = s1 === s2;
  const p2 = match.p2 && match.p2 !== zeroAddress ? match.p2 : undefined;
  const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");
  const winner = tie ? "DRAW" : p1Won ? short(match.p1) : short(p2);
  return (
    <div className="text-center">
      {!tie && <Confetti />}
      <AssetImg src={tie ? assets.artDraw : assets.artWin} alt="" className="mx-auto mb-4 h-32 w-auto" fallback={null} />
      {endedRandom && <div className="display mb-3 text-xl uppercase tracking-widest neon-gold animate-pulseGlow">⚡ ENDED SUDDENLY!</div>}
      <div className="display text-2xl text-white/50">Winner</div>
      <div className="display mt-2 text-6xl font-black neon-bagi md:text-8xl">{winner}</div>
      <div className="mt-8 flex items-center justify-center gap-10">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40">{short(match.p1)}</div>
          <div className="display text-4xl font-black">{fmtUsdc(payoutOf(stake, s1))}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40">{short(p2)}</div>
          <div className="display text-4xl font-black">{fmtUsdc(payoutOf(stake, s2))}</div>
        </div>
      </div>
    </div>
  );
}

function ClaimToast({ amount }: { amount: bigint }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2 animate-pulseGlow rounded-full border border-gold/60 bg-gold/15 px-5 py-2 text-center">
      <span className="display neon-gold text-lg">💰 Claimed {fmtUsdc(amount)} {CURRENCY}</span>
    </div>
  );
}

function Big({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[86vh] items-center justify-center text-2xl text-white/50">{children}</div>;
}
