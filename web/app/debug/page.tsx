"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { erc20Abi, formatUnits, isAddress, type Address, type Hex } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { monadTestnet } from "@/lib/monadChain";
import { Button, Chip, Panel } from "@/components/ui";
import {
  describeError,
  tegaAbi,
  TEGA_ADDRESS,
  useAnte,
  useJackpot,
  useMatch,
  useStake,
  useStakeFlow,
  useTegaTx,
  useTrustScore,
  useUsdcAllowance,
  useUsdcBalance,
  USDC_ADDRESS,
} from "@/lib/tega/hooks";
import { buildCommitHash, loadSalt, randomSalt32, saveSalt, sweepStaleSalts } from "@/lib/tega/commit";
import { Choice, PHASE_LABEL, type PlayableChoice } from "@/lib/tega/types";
import { FAUCET_URL, IS_TEGA_CONFIGURED, USDC_DECIMALS } from "@/lib/tega/constants";

const EXPLORER = monadTestnet.blockExplorers.default.url;
const usdc = (v?: bigint) => (v === undefined ? "—" : `${formatUnits(v, USDC_DECIMALS)} USDC`);

function parseId(s: string): bigint | null {
  if (!/^\d+$/.test(s.trim())) return null;
  try {
    return BigInt(s.trim());
  } catch {
    return null;
  }
}
function parseAddr(s: string): Address | null {
  const t = s.trim();
  if (t === "") return "0x0000000000000000000000000000000000000000";
  return isAddress(t) ? t : null;
}

export default function DebugPage() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  // inputs
  const [invited, setInvited] = useState("");
  const [matchId, setMatchId] = useState("1");
  const [round, setRound] = useState("1");
  const [choice, setChoice] = useState<PlayableChoice>(Choice.Bagi);
  const [anteRound, setAnteRound] = useState("1");
  const [trustAddr, setTrustAddr] = useState("");

  // reads (hooks must run unconditionally)
  const stake = useStake();
  const jackpot = useJackpot();
  const ante = useAnte(Number(anteRound) || 0);
  const match = useMatch(parseId(matchId) ?? undefined);
  const trust = useTrustScore((isAddress(trustAddr) ? trustAddr : undefined) as Address | undefined);
  const balance = useUsdcBalance(address);
  const allowance = useUsdcAllowance(address);
  // Live STAKE only — never the display fallback in the approve/stake path (constants.ts invariant).
  const liveStake = stake.data as bigint | undefined;
  const flow = useStakeFlow(liveStake);

  // writes
  const tx = useTegaTx();

  useEffect(() => sweepStaleSalts(), []);

  const wrongChain = isConnected && chainId !== monadTestnet.id;
  const writesDisabled = !isConnected || wrongChain || !IS_TEGA_CONFIGURED || tx.isPending || tx.isMining;

  const parsedMatchId = parseId(matchId);
  const parsedRound = Number(round) || 0;

  const previewHash = useMemo<Hex | "—">(() => {
    if (!address || parsedMatchId === null || parsedRound < 1) return "—";
    return buildCommitHash(choice, `0x${"11".repeat(32)}`, parsedMatchId, parsedRound, address);
  }, [address, parsedMatchId, parsedRound, choice]);

  // ---- write actions (literal functionName keeps full typing) ----
  function approve() {
    if (liveStake === undefined) return; // wait for the live STAKE read
    tx.writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      chainId: monadTestnet.id,
      functionName: "approve",
      args: [TEGA_ADDRESS, liveStake], // exact live STAKE (never MaxUint256, never the fallback)
    });
  }
  function createMatch() {
    const inv = parseAddr(invited);
    if (!inv) return;
    tx.writeContract({ address: TEGA_ADDRESS, abi: tegaAbi, chainId: monadTestnet.id, functionName: "createMatch", args: [inv] });
  }
  function joinMatch() {
    if (parsedMatchId === null) return;
    tx.writeContract({ address: TEGA_ADDRESS, abi: tegaAbi, chainId: monadTestnet.id, functionName: "joinMatch", args: [parsedMatchId] });
  }
  function commit() {
    if (parsedMatchId === null || !address || parsedRound < 1) return;
    const salt = randomSalt32();
    saveSalt(address, parsedMatchId, parsedRound, salt);
    const hash = buildCommitHash(choice, salt, parsedMatchId, parsedRound, address);
    tx.writeContract({ address: TEGA_ADDRESS, abi: tegaAbi, chainId: monadTestnet.id, functionName: "commit", args: [parsedMatchId, hash] });
  }
  function reveal() {
    if (parsedMatchId === null || !address) return;
    const salt = loadSalt(address, parsedMatchId, parsedRound);
    if (!salt) {
      alert(`No saved salt for match ${matchId} round ${round} — cannot reveal from this browser.`);
      return;
    }
    tx.writeContract({ address: TEGA_ADDRESS, abi: tegaAbi, chainId: monadTestnet.id, functionName: "reveal", args: [parsedMatchId, choice, salt] });
  }
  function poke() {
    if (parsedMatchId === null) return;
    tx.writeContract({ address: TEGA_ADDRESS, abi: tegaAbi, chainId: monadTestnet.id, functionName: "poke", args: [parsedMatchId] });
  }
  function claim() {
    if (parsedMatchId === null) return;
    tx.writeContract({ address: TEGA_ADDRESS, abi: tegaAbi, chainId: monadTestnet.id, functionName: "claim", args: [parsedMatchId] });
  }
  function cancel() {
    if (parsedMatchId === null) return;
    tx.writeContract({ address: TEGA_ADDRESS, abi: tegaAbi, chainId: monadTestnet.id, functionName: "cancel", args: [parsedMatchId] });
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 p-6">
      <header className="flex items-center justify-between">
        <h1 className="display text-2xl font-black">
          <span className="neon-bagi">TE</span>
          <span className="neon-embat">GA</span> <span className="text-white/60">debug</span>
        </h1>
        <ConnectButton chainStatus="icon" showBalance={false} />
      </header>

      <Chip className="neon-mon">testnet-only console · Monad 10143</Chip>

      {!IS_TEGA_CONFIGURED && (
        <Panel className="border-embat/50">
          <p className="neon-embat display text-sm">NEXT_PUBLIC_CONTRACT_ADDRESS is not set.</p>
          <p className="mt-1 text-xs text-white/70">Reads and writes are disabled until a deployed Tega address is configured.</p>
        </Panel>
      )}

      {!isConnected ? (
        <Panel>
          <p className="text-sm text-white/70">Connect a wallet to use the console.</p>
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
          {/* identity & balances */}
          <Panel className="space-y-1 text-sm">
            <Row label="Address" value={address ?? "—"} mono />
            <Row label="Tega contract" value={TEGA_ADDRESS} mono />
            <Row label="USDC balance" value={usdc(balance.data as bigint | undefined)} />
            <Row label="Allowance → Tega" value={usdc(allowance.data as bigint | undefined)} />
            <Row label="Needs approval" value={flow.needsApproval ? "yes" : "no"} />
            <a className="display text-xs text-gold underline-offset-4 hover:underline" href={FAUCET_URL} target="_blank" rel="noopener noreferrer">
              Get test USDC ↗
            </a>
          </Panel>

          {/* reads */}
          <Panel className="space-y-2">
            <h2 className="display text-sm text-white/60">Reads</h2>
            <Row label="STAKE" value={usdc(stake.data as bigint | undefined)} />
            <Row label="jackpot" value={usdc(jackpot.data as bigint | undefined)} />
            <Field label="ante(round)" value={anteRound} onChange={setAnteRound} placeholder="1">
              <span className="text-sm text-white/80">{usdc(ante.data as bigint | undefined)}</span>
            </Field>
            <Field label="trustScore(addr)" value={trustAddr} onChange={setTrustAddr} placeholder="0x…">
              <span className="text-sm text-white/80">{trust.data !== undefined ? String(trust.data) : "—"}</span>
            </Field>
            <div className="text-sm text-white/80">
              match #{matchId}:{" "}
              {match.match
                ? `${PHASE_LABEL[match.match.phase]} · round ${match.match.round} · s1 ${match.match.score1} · s2 ${match.match.score2}`
                : "—"}
            </div>
          </Panel>

          {/* writes */}
          <Panel className="space-y-3">
            <h2 className="display text-sm text-white/60">Writes</h2>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <LabeledInput label="matchId" value={matchId} onChange={setMatchId} />
              <LabeledInput label="round" value={round} onChange={setRound} />
              <LabeledInput label="invited (blank = open)" value={invited} onChange={setInvited} />
              <label className="flex flex-col gap-1">
                <span className="text-white/60">choice</span>
                <select
                  className="rounded-md border border-white/15 bg-ink px-2 py-1"
                  value={choice}
                  onChange={(e) => setChoice(Number(e.target.value) as PlayableChoice)}
                >
                  <option value={Choice.Bagi}>Bagi (share)</option>
                  <option value={Choice.Steal}>Steal (embat)</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="gold" onClick={approve} disabled={writesDisabled || liveStake === undefined}>approve STAKE</Button>
              <Button variant="bagi" onClick={createMatch} disabled={writesDisabled || parseAddr(invited) === null}>createMatch</Button>
              <Button variant="bagi" onClick={joinMatch} disabled={writesDisabled || parsedMatchId === null}>joinMatch</Button>
              <Button onClick={commit} disabled={writesDisabled || parsedMatchId === null}>commit</Button>
              <Button onClick={reveal} disabled={writesDisabled || parsedMatchId === null}>reveal</Button>
              <Button variant="ghost" onClick={poke} disabled={writesDisabled || parsedMatchId === null}>poke</Button>
              <Button variant="gold" onClick={claim} disabled={writesDisabled || parsedMatchId === null}>claim</Button>
              <Button variant="embat" onClick={cancel} disabled={writesDisabled || parsedMatchId === null}>cancel</Button>
            </div>

            <TxStatus />
          </Panel>

          {/* hash parity */}
          <Panel className="space-y-1">
            <h2 className="display text-sm text-white/60">Commit hash preview (salt 0x11…11)</h2>
            <p className="break-all font-mono text-xs text-white/70">{previewHash}</p>
          </Panel>
        </>
      )}
    </main>
  );

  function TxStatus() {
    if (tx.error) return <p className="neon-embat text-xs">Error: {describeError(tx.error)}</p>;
    if (!tx.hash) return null;
    return (
      <p className="text-xs">
        <a className="text-mon underline-offset-4 hover:underline" href={`${EXPLORER}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer">
          {tx.hash.slice(0, 12)}… ↗
        </a>{" "}
        {tx.isMining && <span className="neon-gold">pending…</span>}
        {tx.isConfirmed && <span className="neon-bagi">mined ✓</span>}
        {tx.isReverted && <span className="neon-embat">reverted ✗</span>}
      </p>
    );
  }
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/60">{label}</span>
      <span className={mono ? "break-all font-mono text-xs" : ""}>{value}</span>
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-white/60">{label}</span>
      <input className="rounded-md border border-white/15 bg-ink px-2 py-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/60">{label}</span>
      <div className="flex items-center gap-2">
        <input
          className="w-40 rounded-md border border-white/15 bg-ink px-2 py-1 text-xs"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {children}
      </div>
    </div>
  );
}
