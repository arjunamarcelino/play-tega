# TEGA — Product & Strategy

*Split it. Or steal it.* — an on-chain split-or-steal game show on Monad.

This document covers the non-technical case for TEGA: who it's for, how it makes money, why it's novel, and why Monad is the right chain. For how it works and how to run it, see [README.md](./README.md).

---

## Product–market fit

**The format already works — TEGA makes it on-chain and real-stakes.** Split-or-steal is one of the most durable formats in entertainment: *Golden Balls*, *Friend or Foe?*, *The Trust*, countless creator videos, and the entire academic canon of the Prisoner's Dilemma. People love watching other people decide whether to betray each other for money. TEGA turns that into a product where the money is real, the outcome is trustless, and anyone can be a contestant.

**Who it's for:**

- **Crypto-native social players** who want a fast, high-stakes, PvP game that isn't another idle farm or a 3-month-vesting "GameFi" grind. A match is minutes, the stake is small, the tension is total.
- **Streamers & event hosts.** The spectator screen (`/spectator/[id]`) is built to be projected or shared on stream: two cards, a VS layout, synchronized reveals, sound. It's a ready-made segment for a Twitch stream, a conference side-event, or a community night.
- **Communities & brands** running engagement moments — a tournament bracket at a hackathon, a sponsored "trust night," an onboarding activation that happens to teach people how to use a wallet.

**Why it fits the moment:** the hard part of a social betting game is *trust in the house*. TEGA has no house. Escrow, payoff, and payout are enforced by a single audited contract; the jackpot is a transparent on-chain pool. The product's core promise — "we literally cannot cheat you" — is only credible on-chain, and only *fun* on a chain fast enough to feel live.

**Wedge → expansion:** 1v1 duels are the wedge (lowest friction, instantly legible). The same engine extends to mass-jackpot rooms (a whole crowd in one round), tournaments, and a reputation layer (Snake Score™) — each a reason to come back and a new surface for hosts to program.

---

## Revenue potential and strategy

TEGA's economics are deliberately simple and transparent — the contract already routes value to two places (players and the jackpot pool), and the business layers on top of that without touching player escrow.

**Primary levers:**

1. **Protocol rake on antes / jackpot (where legal).** A small, explicit percentage of the at-risk pot or of the mutual-betrayal jackpot. Because it's on-chain and visible, it's a fee, not a hidden edge. The contract's `jackpot` pool and `distributeJackpot` (treasurer-gated) are the hook for programmatic, rules-based distribution.
2. **Stake tiers.** `STAKE` is a contract constant per deployment; shipping `$1 / $5 / $25 / $100` tables lets casual and high-roller demand self-segment, multiplying rake volume off the same code.
3. **Tournaments & the Weekly Jackpot.** Mutual betrayals burn their pot into a shared jackpot; topping a leaderboard (Snake Score™) to claim it creates a recurring, time-boxed reason to play — and an entry-fee surface.
4. **Hosted / sponsored game nights.** Brands and communities pay to run a themed TEGA event (custom table, branded spectator screen, prize pool). The spectator view is the sponsorship inventory.
5. **Cosmetics & the engine SDK.** Card skins, avatars, and taunts are non-P2W cosmetic revenue. Longer term, a reskinnable "TEGA engine" lets other teams launch their own trust-game with TEGA taking a cut.

**Go-to-market:** lead with free testnet play (`dev.playtega.xyz`) to remove all risk from learning the format, convert to real-stakes mainnet (`playtega.xyz`), and grow through the spectator screen — every projected match or stream clip is an ad that ends in a QR code to join. Live events (hackathons, meetups) are the ideal first distribution: TEGA is a crowd activity, not a solo app.

> **Compliance note:** real-money PvP has jurisdiction-specific rules. The design keeps rake explicit and optional per deployment, supports a no-rake / free-play mode (testnet), and gates any treasury action behind a multisig role — so operators can deploy within their legal constraints.

---

## Innovation and originality

- **A game-show format as a trustless primitive.** Plenty of projects tokenize games; TEGA takes a beloved *television* format and makes its core mechanic — simultaneous secret choice under real stakes — provably fair on-chain. The novelty is the fusion: the social drama of Golden Balls with the settlement guarantees of a smart contract.
- **Grind-resistant random endpoint without a VRF.** The "you never know which round is the last" mechanic is what kills end-game betrayal (backward induction). TEGA derives it from the players' own revealed commit-salts — `keccak256(salt₁, salt₂, id, round)` — which are locked inside each commit before the opponent's is known. No oracle, no fee, no round-trip, and neither player can bias it. This is a genuinely original use of commit-reveal for *fair timing*, not just fair choice.
- **Spectator-first design.** Most on-chain games are played heads-down in a wallet. TEGA treats the audience as a first-class surface: a projector-ready screen where choices stay hidden until a synchronized flip. It's designed to be *watched*, which is what makes it spreadable.
- **No house, no backend, no indexer.** The whole experience — matchmaking (via events), state, payouts — runs off one contract and the chain. "Incoming challenges" come from `getLogs` on an indexed topic; there's nothing to trust and nothing to run.
- **Solvency by construction.** The accounting invariant `payout₁ + payout₂ + jackpot == 2·STAKE` holds for every match, including forfeits — the jackpot can never be left unbacked. That rigor is itself a differentiator in a space full of under-collateralized game economies.

---

## Why Monad

TEGA is only fun if it feels *live*, and only viable if a `$5` match doesn't cost more in gas than it's worth. That combination — real-time interactivity, many small transactions, and real settlement — is precisely Monad's lane.

- **Live-game latency.** Commit–reveal is two transactions per round; a full match is up to ~16 plus a claim. Monad's sub-second blocks and fast finality make each round play at conversation speed, so the spectator screen flips cards *as the drama happens*, not minutes later in a mempool.
- **Economics that survive small stakes.** Cheap, predictable gas keeps low-tier tables worth playing. Monad charging on the **gas limit** (not gas used) is a quirk TEGA handles in the frontend with tight limits — predictability is a feature for a game with a fixed per-round cost.
- **EVM equivalence = zero rewrite risk.** Plain Solidity 0.8.24 + OpenZeppelin v5, Foundry, and standard wallet tooling (wagmi/viem/RainbowKit). Nothing bespoke to maintain.
- **No oracle dependency.** Chainlink VRF / Switchboard aren't on Monad — which pushed TEGA to a better, oracle-free randomness design that also happens to be faster and free.
- **An ecosystem that wants social, consumer apps.** TEGA is a crowd-pleasing, easy-to-demo consumer app — the kind of "why is this on-chain? *because it has to be*" showcase that fits Monad's push for real users, not just TVL. Live events in the Monad community are a natural first distribution channel.

See [README § Why Monad (technical)](./README.md#why-monad-technical) for the implementation-level detail.
