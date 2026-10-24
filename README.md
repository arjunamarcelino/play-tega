# TEGA — *Split it. Or steal it.*

> **An on-chain split-or-steal game show.** Two players each escrow a fixed USDC stake, then play a multi-round **commit–reveal** duel: every round they secretly pick **BAGI** (share 🤝) or **EMBAT** (steal 🔪) and open simultaneously. An escalating ante moves between them by a payoff matrix; the game ends on a hidden random endpoint or at round 8. Settled fully on-chain on **Monad**.

| | |
|---|---|
| 🎮 **Play (testnet)** | **https://dev.playtega.xyz** |
| 🏆 **Play (mainnet)** | **https://playtega.xyz** |
| 📜 **Contract** | [`0xB45A79238aD1E9A2eb85E9E2e3dd57E10FeA2aeC`](https://testnet.monadvision.com/address/0xB45A79238aD1E9A2eb85E9E2e3dd57E10FeA2aeC) (same address on both networks) |
| 💡 **Why it matters** | [PITCH.md](./PITCH.md) — product-market fit, revenue, innovation, why Monad |

This is a monorepo: a hardened Solidity game contract (`contracts/`) and a Next.js dapp (`web/`) with player + spectator screens.

---

## Table of contents

- [Game mechanics](#game-mechanics)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Playing a match locally](#playing-a-match-locally)
- [Frontend routes](#frontend-routes)
- [Environment variables](#environment-variables)
- [Deploy the contract](#deploy-the-contract)
- [Deploy the web app (Docker)](#deploy-the-web-app-docker)
- [Deployed addresses](#deployed-addresses)
- [Why Monad (technical)](#why-monad-technical)
- [Security notes](#security-notes)
- [Project layout](#project-layout)

---

## Game mechanics

A match is a two-player state machine: `WaitP2 → Commit ⇄ Reveal → Ended` (plus `Cancelled`).

| Parameter | Value | Notes |
|---|---|---|
| `STAKE` | **5 USDC** (6-dec) | Each player escrows this on join. |
| `ante(r)` | `STAKE · r / 36` | Linear, escalating. Σ over rounds 1–8 ≈ STAKE. |
| Pot per round | `2 · ante(r)` | The value at risk that round. |
| `MIN_ROUNDS` | **3** | Rounds 1–3 are guaranteed. |
| `MAX_ROUNDS` | **8** | Hard cap. |
| `END_PROB` | **25%** | From round 3 on, each round has a 25% chance to be the last. |
| `COMMIT_WIN` | **15 s** | Deadline to commit. |
| `REVEAL_WIN` | **10 s** | Deadline to reveal. |

**Per round:**

1. **Commit** — each player picks BAGI/EMBAT, generates a random 32-byte salt, and submits `keccak256(choice, salt, id, round, player)`. The choice stays hidden. Both commits → phase flips to **Reveal**.
2. **Reveal** — each player opens `(choice, salt)`; the contract checks it against the stored hash. Both reveals → the round **resolves**.
3. **Resolve** — the payoff matrix applies, scores update, and a grind-resistant random endpoint decides whether the game ends.

**Payoff matrix** (ante `A` for the round):

| | They BAGI 🤝 | They EMBAT 🔪 |
|---|---|---|
| **You BAGI 🤝** | `0 / 0` (split, keep your ante) | `−A / +A` (you get nothing) |
| **You EMBAT 🔪** | `+A / −A` (you take it all) | `−A / −A` → **both burn to the jackpot** |

**Random endpoint:** after round 3, the last-round roll is seeded from `keccak256(salt₁, salt₂, id, round)` using the *revealed* salts — each salt is locked inside its commit hash before the opponent's is known, so neither player can grind the outcome (no VRF needed). Hiding which round is last is what defeats end-game backward-induction betrayal.

**Payout:** at `Ended`, each player pulls `STAKE + score` via `claim()`. Invariant (audited): `payout₁ + payout₂ + jackpot == 2·STAKE` for every match, and each payout is in `[0, 2·STAKE]`.

**Anti-grief:** if a player stalls past a deadline, anyone can call `poke(id)` to force resolution — the no-show forfeits their remaining escrow to the honest player (or to the jackpot on a mutual no-show).

Full rules and the security rationale live in the heavily-commented [`contracts/src/Tega.sol`](./contracts/src/Tega.sol).

---

## Architecture

```
┌─────────────────────────────┐        reads: matches(id), commitOf, revealOf, jackpot
│  web/ (Next.js 14, wagmi)   │◀──────────────────────────────────────────────┐
│                             │        writes: createMatch/join/commit/reveal/  │
│  lib/tega/ integration ─────┼──────── poke/claim/cancel (RainbowKit wallet)  │
│  • useTegaMatch (state)     │                                                 │
│  • useTegaActions (writes)  │        events: watchContractEvent                │
│  • commit.ts (salt+hash)    │◀──────── Committed/Revealed/RoundResolved/ ──────┤
└─────────────────────────────┘          RoundStarted/GameEnded/Claimed          │
                                                                                 │
                                   Monad ◀──────────────────────────────────────┘
                                   contracts/src/Tega.sol (Solidity 0.8.24)
```

The frontend is driven by **authoritative reads + live events**:

- **`useTegaMatch(id)`** polls `matches(id)` (phase, round, deadline, scores, claimed) plus per-round `commitOf`/`revealOf` reads — refresh-safe — and layers a single `watchContractEvent` subscription for snappy history, reveal-flip, and claim updates.
- **`useTegaActions()`** wraps all writes behind one in-flight tx, and owns **salt persistence**: on commit it stores `(salt, choice)` in `localStorage` so the Reveal phase can **auto-open** without re-prompting. Losing the salt before reveal = forfeit (surfaced with a clear error).
- **`lib/tega/commit.ts`** reproduces the contract's hash preimage exactly and is unit-tested against a `cast`-generated fixture.

There is no backend and no indexer: "incoming challenges" come from `getLogs` on the indexed `invited` topic, and "your matches" from a per-wallet `localStorage` index.

---

## Tech stack

| Package | What | Tech |
|---|---|---|
| `contracts/` | Game contract + deploy | Foundry · Solidity `^0.8.24` (EVM `cancun`) · OpenZeppelin v5 (SafeERC20, ReentrancyGuard, AccessControl) |
| `web/` | Dapp | Next.js **14.2** (App Router, TS) · Tailwind **v3** · wagmi **2.16** · viem **2.31** · RainbowKit **2.2** · `@tanstack/react-query` v5 · GSAP (landing motion) · `qrcode.react` |

Versions are **pinned deliberately** (newer wagmi/Next/Tailwind majors break the build in specific ways) — see the rationale table in [`CLAUDE.md`](./CLAUDE.md).

---

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org) **18+** and npm
- [Foundry](https://getfoundry.sh) (`forge`, `cast`) — `curl -L https://foundry.paradigm.xyz | bash && foundryup`

### Contracts

```sh
cd contracts
forge build          # expect "Compiler run successful!"
forge test           # full test suite (payoff matrix, forfeit, invariants)
forge fmt            # format
```

### Web

```sh
cd web
cp .env.example .env.local        # then edit — see "Environment variables" below
npm install                       # if peer-dep ERESOLVE: npm install --legacy-peer-deps
npm run dev                       # http://localhost:3000
```

Other web scripts: `npm run build` · `npm run typecheck` · `npm test` (vitest) · `npm run gen:abi` (regenerate the typed ABI after a contract change).

At minimum set `NEXT_PUBLIC_CONTRACT_ADDRESS` (a deployed Tega address) and, for the testnet, `NEXT_PUBLIC_FAUCET_URL`. The mainnet/testnet Tega is already deployed (see [Deployed addresses](#deployed-addresses)), so you can point a local dev build straight at it.

---

## Playing a match locally

1. Open `http://localhost:3000` → **Enter the lobby** (`/app`).
2. Connect a wallet on **Monad testnet** (chainId 10143). Get test USDC from the faucet link (devnads).
3. Click **Create open table**. Your wallet signs an `approve` (first time only) then `createMatch` — you're routed to `/play/<id>` showing the match id + QR.
4. In a **second browser / wallet**, open the shared link (or enter the id in the lobby) and **Join** — this escrows the second stake and starts round 1.
5. Each side picks **BAGI**/**EMBAT** before the timer ends. When both have committed, the app **auto-reveals**; the cards flip and scores update.
6. Repeat until the game ends; on the **Ended** screen each player clicks **Claim** to pull `STAKE + score`.
7. Open `/spectator/<id>` on a projector for the game-show view — cards only flip on resolve, synchronized.

> **Salt persistence:** your commit salt is stored per `(wallet, match, round)` in `localStorage`. Refreshing mid-match is fine; clearing storage or switching browsers between commit and reveal means you can't reveal that round (the UI warns you).

---

## Frontend routes

| Route | Purpose |
|---|---|
| `/` | Marketing landing (full game explainer, payoff matrix, round model). |
| `/app` | Lobby — create / challenge / join, your matches, incoming challenges. |
| `/play/[matchId]` | Player screen — commit/reveal loop, auto-reveal, poke, claim. |
| `/spectator/[matchId]` | Big-screen spectator view (projector-friendly). |
| `/debug` | Low-level console: raw reads + every write, tx status, hash-parity preview (testnet). |

---

## Environment variables

All web vars are `NEXT_PUBLIC_*` and are **inlined at build time** (not read at runtime) — for Docker they must be passed as `--build-arg`.

| Package | Var | Required | Purpose |
|---|---|---|---|
| web | `NEXT_PUBLIC_CONTRACT_ADDRESS` | ✅ | Deployed Tega address. Unset → app runs read-only ("not configured"). |
| web | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ⚠️ | Required by RainbowKit's `getDefaultConfig` for WalletConnect wallets (free at [cloud.reown.com](https://cloud.reown.com)). Falls back to a placeholder so the build still works with injected/MetaMask only. |
| web | `NEXT_PUBLIC_USDC_ADDRESS` | — | Stake token per network. Unset → devnads testnet USDC. Mainnet: `0x754704…b603`. |
| web | `NEXT_PUBLIC_USDC_DECIMALS` | — | Defaults to `6` (both testnet and mainnet USDC are 6-dec). |
| web | `NEXT_PUBLIC_FAUCET_URL` | — | Faucet link for test USDC. **Fail-closed:** unset → no faucet UI anywhere (this is the production/mainnet default). Set to `https://devnads.com/tokens` on testnet. |
| web | `NEXT_PUBLIC_EXPLORER_URL` | — | Block-explorer base used to make the contract address + tx hashes clickable. Testnet `https://testnet.monadvision.com` · mainnet `https://monadvision.com`. |
| web | `NEXT_PUBLIC_SITE_URL` | — | Absolute base for OG/metadata (e.g. `https://playtega.xyz`). |
| contracts | `MONAD_RPC_URL` | ✅ (deploy) | RPC endpoint for deploy/scripts. |
| contracts | `PRIVATE_KEY` | ✅ (deploy) | **Burner** deployer key — testnet only; prefer an encrypted keystore. |
| contracts | `USDC_ADDRESS` / `ADMIN_ADDRESS` | — | Deploy-script overrides (e.g. mainnet USDC, treasurer multisig). |

> Never prefix an **authenticated/keyed** RPC URL with `NEXT_PUBLIC_` — that ships the API key in client JS. The public RPC is fine and is hardcoded in `web/lib/monadChain.ts`.

---

## Deploy the contract

The stake token (USDC) already exists on both networks — **only `Tega` is deployed.** The deploy script (`contracts/script/Deploy.s.sol`) bakes in the USDC address and sets admin/treasurer to the deployer unless overridden.

### Testnet

```sh
cd contracts
cp .env.example .env            # set MONAD_RPC_URL + a BURNER PRIVATE_KEY
cast wallet address --private-key $PRIVATE_KEY    # fund this with testnet MON (gas)
make deploy-testnet             # broadcasts to chainId 10143 + Sourcify verify
```

Monad charges gas on the **gas limit** (not gas used), so a deploy needs only a little MON — but the balance must be non-zero. The script prints the deployed **Tega address**.

> **Key safety:** prefer an encrypted keystore over a plaintext key:
> ```sh
> cast wallet import tega-burner --interactive
> forge script script/Deploy.s.sol:Deploy --rpc-url monad --account tega-burner --broadcast
> ```

### Mainnet

```sh
cd contracts && make deploy-mainnet     # chainId 143, RPC https://rpc.monad.xyz + Sourcify verify
```

Wires to real USDC (`0x754704…b603`); fund the deployer with **real MON** (~0.7 MON). Pass `ADMIN_ADDRESS=<safe-multisig>` to make a multisig the treasurer. `STAKE` is a fixed **5 USDC** — on mainnet that's real value.

### Wire the address into the web app

```sh
# 1. paste the printed Tega address into web/.env.local:
#      NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
# 2. regenerate the typed ABI only if the interface changed:
cd contracts && make abi        # forge build + writes web/lib/tega/abi.ts
```

The ABI at `web/lib/tega/abi.ts` is typed `as const` for wagmi/viem and generated from `contracts/out/Tega.sol/Tega.json` by `scripts/gen-abi.mjs`.

---

## Deploy the web app (Docker)

`web/Dockerfile` produces a Next **standalone** image (multi-stage, non-root, port 3000). Two things to know:

- **Build context is the repo root** (not `web/`) — all COPY paths are `web/…`, which is what most PaaS do by default. Point your platform's Dockerfile to `web/Dockerfile` and leave the base directory at the repo root.
- `NEXT_PUBLIC_*` are **build-time**, so pass them as `--build-arg` (setting them only at `docker run` does nothing).

**Testnet image** (`dev.playtega.xyz`) — run from the **repo root**:

```sh
docker build -f web/Dockerfile -t tega-web:testnet \
  --build-arg NEXT_PUBLIC_CONTRACT_ADDRESS=0xB45A79238aD1E9A2eb85E9E2e3dd57E10FeA2aeC \
  --build-arg NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your-reown-id> \
  --build-arg NEXT_PUBLIC_USDC_ADDRESS=0x56bf9CDc3C1876F3F22655a0016C2743E9e39a73 \
  --build-arg NEXT_PUBLIC_FAUCET_URL=https://devnads.com/tokens \
  --build-arg NEXT_PUBLIC_EXPLORER_URL=https://testnet.monadvision.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://dev.playtega.xyz \
  .
docker run --rm -p 3000:3000 tega-web:testnet
```

**Mainnet image** (`playtega.xyz`) — mainnet USDC + explorer, **omit** the faucet arg so no faucet UI is shown:

```sh
docker build -f web/Dockerfile -t tega-web:mainnet \
  --build-arg NEXT_PUBLIC_CONTRACT_ADDRESS=0xB45A79238aD1E9A2eb85E9E2e3dd57E10FeA2aeC \
  --build-arg NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your-reown-id> \
  --build-arg NEXT_PUBLIC_USDC_ADDRESS=0x754704Bc059F8C67012fEd69BC8A327a5aafb603 \
  --build-arg NEXT_PUBLIC_EXPLORER_URL=https://monadvision.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://playtega.xyz \
  .
docker run --rm -p 3000:3000 tega-web:mainnet
```

The container serves on `PORT=3000`/`HOSTNAME=0.0.0.0` (both overridable via env at `docker run`). The repo-root `.dockerignore` keeps `node_modules`, `contracts/`, and `.env*.local` out of the image.

---

## Deployed addresses

| Network | Contract | Address |
|---|---|---|
| Monad **mainnet** (143) | **Tega** | [`0xB45A79238aD1E9A2eb85E9E2e3dd57E10FeA2aeC`](https://monadvision.com/address/0xB45A79238aD1E9A2eb85E9E2e3dd57E10FeA2aeC) *(verified)* |
| Monad **mainnet** (143) | USDC (stake) | [`0x754704Bc059F8C67012fEd69BC8A327a5aafb603`](https://monadvision.com/address/0x754704Bc059F8C67012fEd69BC8A327a5aafb603) *(real USDC, 6-dec)* |
| Monad **testnet** (10143) | **Tega** | [`0xB45A79238aD1E9A2eb85E9E2e3dd57E10FeA2aeC`](https://testnet.monadvision.com/address/0xB45A79238aD1E9A2eb85E9E2e3dd57E10FeA2aeC) *(verified)* |
| Monad **testnet** (10143) | USDC (stake) | [`0x56bf9CDc3C1876F3F22655a0016C2743E9e39a73`](https://testnet.monadvision.com/address/0x56bf9CDc3C1876F3F22655a0016C2743E9e39a73) *(devnads test USDC)* |

> Both deployments share the same address because they were created by the same deployer at nonce 0 (CREATE is deterministic).

**Network:** testnet chainId **10143** · mainnet **143** · native **MON** (18 dec) · testnet RPC `https://testnet-rpc.monad.xyz` · mainnet RPC `https://rpc.monad.xyz` · explorer **MonadVision**.

**Players stake test USDC, not MON.** On testnet, claim it at [devnads.com/tokens](https://devnads.com/tokens), then approve `Tega` (the app prompts). The contract never mints — each player brings their own USDC.

---

## Why Monad (technical)

TEGA is a **live game show**: commit–reveal is two on-chain transactions *per round*, and the drama only lands if cards flip the instant both players lock in. That's a latency-and-cost profile that makes most L1s unplayable as a real-time social game — and exactly where Monad fits.

- **Sub-second blocks + fast finality** make each commit → reveal → resolve feel interactive, so a round plays at human conversation speed rather than mempool speed. The spectator screen flips both cards within a round, not minutes later.
- **Cheap, predictable gas** keeps a `$5` table economically sane when a full match is up to ~16 commit/reveal transactions plus a claim. Monad charging gas on the **gas limit** (not gas used) is handled directly in the frontend by setting tight limits.
- **Full EVM equivalence** means the contract is plain Solidity 0.8.24 with OpenZeppelin v5 — no rewrites, standard tooling (Foundry), standard wallets (RainbowKit/wagmi/viem).
- **No external VRF dependency.** Chainlink VRF / Switchboard aren't on Monad, so the random endpoint is derived from the players' own revealed commit-salts (`keccak256(salt₁, salt₂, id, round)`) — grind-resistant without an oracle round-trip, which also keeps the game fast and free of extra fees.
- **Settlement is the product.** Payouts are pulled on-chain the moment a match ends; there's no custodial escrow service or off-chain settlement to trust.

The broader strategic case (ecosystem, distribution, why *now*) is in [PITCH.md](./PITCH.md#why-monad).

---

## Security notes

`Tega.sol` is audited to mainnet grade (no open Critical/High). Load-bearing invariants — don't regress them:

- **Existence guard** in `joinMatch` (`require(m.p1 != address(0))`) — without it an uncreated id's zero-struct would pass every check and drain `2·STAKE`.
- **Forfeit awards *remaining* escrow** (`2·STAKE − jackpot-so-far`), not a fresh `2·STAKE` — otherwise a mutual-steal round before a timeout leaves the jackpot unbacked.
- **`reveal` has a deadline** (symmetry with `commit`) so a laggard can't race `poke` to dodge a forfeit.
- **Random endpoint uses revealed salts**, never `block.prevrandao` (grindable).
- **SafeERC20 everywhere**; stake pulls assert exact `STAKE` received (rejects fee-on-transfer). Pull-payment `claim` with CEI + `nonReentrant`.
- **`jackpot` is a prize pool** spendable only via `distributeJackpot` (gated to a `TREASURER_ROLE` multisig, bounded to the jackpot balance) — it can never touch active-match escrow.

The web app ships a scoped CSP, `X-Frame-Options: DENY`, and related headers (`web/next.config.mjs`).

---

## Project layout

```
play-tega/
├── contracts/            # Foundry project
│   ├── src/Tega.sol      #   the game (state machine, payoff, payout)
│   ├── script/Deploy.s.sol
│   └── Makefile          #   deploy-testnet / deploy-mainnet / abi
├── scripts/
│   └── gen-abi.mjs       # exports the typed ABI → web/lib/tega/abi.ts
├── web/                  # Next.js app
│   ├── app/              #   (marketing) landing + (game) lobby/play/spectator + /debug
│   ├── components/       #   GameCard, Timer, Confetti, motion, UI primitives
│   ├── lib/tega/         #   integration layer: hooks, actions, state, commit/salt, format
│   ├── Dockerfile        #   production standalone image
│   └── .env.example
├── CLAUDE.md             # repo conventions + pinned-version rationale
├── PITCH.md              # product-market fit, revenue, innovation, why Monad
└── README.md
```
