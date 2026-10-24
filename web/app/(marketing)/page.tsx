import Link from "next/link";
import { JackpotBanner } from "@/components/JackpotBanner";
import { AssetImg } from "@/components/AssetImg";
import { AssetBg } from "@/components/AssetBg";
import { assets } from "@/lib/assets";

// Round-1 ante on the $5 table (STAKE·r/36). Display-only — the game reads the
// live STAKE on-chain. 5/36 ≈ 0.139.
const BASE = 5 / 36;

function CTA({ href, children, tone = "mon" }: { href: string; children: React.ReactNode; tone?: "mon" | "ghost" }) {
  const cls =
    tone === "mon"
      ? "border-mon/60 bg-mon/20 text-[#d9d0ff] hover:bg-mon/35 hover:shadow-neon-mon focus-visible:shadow-neon-mon focus-visible:ring-2 focus-visible:ring-mon"
      : "border-white/20 bg-white/5 text-white/80 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40";
  return (
    <Link href={href} className={`display rounded-xl border px-6 py-3 text-sm font-bold uppercase tracking-widest outline-none transition focus-visible:outline-none ${cls}`}>
      {children}
    </Link>
  );
}

export default function Landing() {
  return (
    <div className="relative z-10">
      {/* HERO */}
      <section className="relative left-1/2 right-1/2 -mx-[50vw] flex w-screen flex-col items-center overflow-hidden px-6 pt-10 pb-20 text-center md:pt-20">
        <AssetBg src={assets.heroBg} opacity={0.4} />
        <div data-hero-group className="relative flex w-full max-w-5xl flex-col items-center">
          <span className="chip display relative mb-6 text-white/60">Live on-chain trust game</span>
          <AssetImg
            src={assets.logo}
            alt="TEGA"
            className="relative mx-auto h-24 w-auto md:h-32"
            fallback={
              <h1 className="display relative text-6xl font-black leading-none tracking-tight md:text-8xl">
                <span className="neon-mon">TEGA</span>
              </h1>
            }
          />
          <AssetImg src={assets.mascot} alt="" className="relative mx-auto mt-6 h-24 w-auto animate-floaty" fallback={null} />
          <p className="display relative mt-4 text-2xl font-bold neon-embat md:text-3xl">Split it. Or steal it.</p>
          <p className="mx-auto mt-5 max-w-lg text-base text-white/70 md:text-lg">
            Two players, one growing pot. Each round, secretly pick <span className="neon-bagi font-bold">BAGI</span> to split or{" "}
            <span className="neon-embat font-bold">EMBAT</span> to take it all. Commit-reveal on-chain, settled in under a second.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <CTA href="/app">Play now</CTA>
            <CTA href="/app" tone="ghost">Host a table</CTA>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2.5 text-[11px] uppercase tracking-[0.25em] text-white/55">
            <span>Live on</span>
            <AssetImg src={assets.monad} alt="Monad" className="h-4 w-auto md:h-5" fallback={<span className="neon-mon font-bold">Monad</span>} />
          </div>
          <p className="mt-3 text-xs uppercase tracking-widest text-white/55">Connect a wallet · plays in your browser</p>
        </div>
      </section>

      {/* MATRIX */}
      <section data-reveal className="mx-auto max-w-4xl px-6 pb-20">
        <AssetImg src={assets.handshake} alt="" className="mx-auto mb-6 h-40 w-auto" fallback={null} />
        <h2 className="display mb-6 text-center text-sm uppercase tracking-[0.3em] text-white/50">The whole game in one table</h2>
        <div className="panel overflow-hidden p-0">
          <div className="grid grid-cols-3 text-center text-sm">
            <div className="p-4" />
            <div className="display p-4 font-bold neon-bagi">They BAGI 🤝</div>
            <div className="display p-4 font-bold neon-embat">They EMBAT 🔪</div>

            <div className="display flex items-center justify-center p-4 font-bold neon-bagi">You BAGI 🤝</div>
            <div className="border border-white/10 p-6">Split it evenly</div>
            <div className="border border-white/10 p-6 text-embat">You get nothing</div>

            <div className="display flex items-center justify-center p-4 font-bold neon-embat">You EMBAT 🔪</div>
            <div className="border border-white/10 p-6 text-bagi">You take it all 💰</div>
            <div className="border border-white/10 p-6 text-white/60">Both lose → jackpot</div>
          </div>
        </div>
      </section>

      {/* SESSION */}
      <section data-reveal className="mx-auto max-w-4xl px-6 pb-20">
        <h2 className="display mb-2 text-center text-sm uppercase tracking-[0.3em] text-white/50">3 to 8 rounds. You never know the last</h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-white/55">
          First 3 rounds are guaranteed. After that, every round has a <span className="neon-gold font-bold">25% chance to be the last</span>, capped at 8.
          Not knowing when it ends is what stops end-game betrayal.
        </p>

        <div className="panel p-6">
          <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-widest text-white/55">
            <span>Round</span>
            <span>Ante grows → pot = 2× ante · $5 table (USDC)</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((r) => {
              const guaranteed = r <= 3;
              const final = r === 8;
              return (
                <div
                  key={r}
                  className={`flex min-w-[84px] flex-1 flex-col items-center rounded-xl border px-3 py-3 ${
                    final ? "border-gold/60 bg-gold/10 shadow-neon-gold" : guaranteed ? "border-bagi/50 bg-bagi/5" : "border-mon/40 bg-mon/5"
                  }`}
                >
                  <div className="display text-lg font-black">R{r}</div>
                  <div className="mt-1 text-xs text-white/60">${(BASE * r).toFixed(2)}</div>
                  <div className="mt-2 text-[10px] uppercase tracking-wider">
                    {final ? <span className="neon-gold">final</span> : guaranteed ? <span className="neon-bagi">safe</span> : <span className="text-white/55">↯ 25% end</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-center text-sm text-white/55">
            Cooperate and keep your ante, grab it all if you betray alone, or <span className="neon-gold">burn it to the jackpot</span> if you both betray.
            Payout = your stake + everything you won.
          </p>
        </div>
      </section>

      {/* JACKPOT */}
      <section data-reveal className="mx-auto max-w-4xl px-6 pb-20">
        <JackpotBanner />
      </section>

      {/* WHY MONAD */}
      <section data-reveal className="mx-auto max-w-4xl px-6 pb-20">
        <h2 className="display mb-8 flex flex-wrap items-center justify-center gap-2.5 text-sm uppercase tracking-[0.3em] text-white/50">
          Only possible on
          <AssetImg src={assets.monad} alt="Monad" className="h-4 w-auto opacity-90 md:h-5" fallback={<span className="neon-mon">Monad</span>} />
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { big: "300ms", small: "block time" },
            { big: "600ms", small: "finality: payout before you blink" },
            { big: "10 reveals", small: "fully on-chain in under a minute" },
          ].map((x) => (
            <div key={x.small} className="panel p-6 text-center">
              <div className="display text-4xl font-black neon-mon">{x.big}</div>
              <div className="mt-2 text-xs uppercase tracking-widest text-white/50">{x.small}</div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-white/55">
          Commit-reveal is two on-chain steps per round. On Ethereum the drama dies in the mempool. On Monad it feels like a live game show.
        </p>
      </section>

      {/* HOW */}
      <section data-reveal className="mx-auto max-w-4xl px-6 pb-24">
        <h2 className="display mb-8 text-center text-sm uppercase tracking-[0.3em] text-white/50">How a round plays</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { n: "01", t: "Lock it", d: "Both players secretly pick BAGI or EMBAT. Choices hashed on-chain." },
            { n: "02", t: "Reveal", d: "Cards flip simultaneously. The pot grows every round." },
            { n: "03", t: "...or not", d: "After round 3, any round has a 25% chance to be the last. You never know." },
          ].map((s) => (
            <div key={s.n} className="panel p-6">
              <div className="display text-3xl font-black text-mon/70">{s.n}</div>
              <div className="display mt-2 text-lg font-bold">{s.t}</div>
              <div className="mt-2 text-sm text-white/60">{s.d}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <CTA href="/app">So… can we trust you?</CTA>
        </div>
      </section>

      {/* ROADMAP */}
      <section data-reveal className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="display mb-2 text-center text-sm uppercase tracking-[0.3em] text-white/50">Roadmap</h2>
        <p className="mb-8 text-center text-sm text-white/55">Playable today: 1v1 trust duels. Everything below is where TEGA goes next.</p>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { tag: "Now · Live", tone: "bagi" as const, title: "The duel", items: ["1v1 multi-round", "Commit-reveal + random endpoint", "Instant on-chain payout", "Spectator big-screen"] },
            { tag: "Next · Soon", tone: "mon" as const, title: "Social layer", items: ["Mass jackpot room (whole crowd)", "Tournaments & brackets", "Snake Score™ reputation", "Creator / streamer mode (OBS)", "VRF fairness"] },
            { tag: "Later · Soon", tone: "gold" as const, title: "Engine & economy", items: ["Brand-sponsored game nights", "Tournament-hosting for communities", "Cosmetics & card skins", "TEGA engine SDK (reskins)", "On-chain rake (where legal)"] },
          ].map((col) => (
            <div key={col.title} className="panel p-6">
              <div className={`chip display mb-3 inline-block ${col.tone === "bagi" ? "neon-bagi" : col.tone === "mon" ? "neon-mon" : "neon-gold"}`}>{col.tag}</div>
              <div className="display mb-3 text-lg font-bold">{col.title}</div>
              <ul className="flex flex-col gap-2 text-sm text-white/65">
                {col.items.map((it) => (
                  <li key={it} className="flex items-start gap-2">
                    <span className={col.tone === "bagi" ? "neon-bagi" : "text-white/55"}>{col.tone === "bagi" ? "✓" : "→"}</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
