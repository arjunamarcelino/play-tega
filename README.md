# TEGA

> **Game-show kepercayaan on-chain.** Two players secretly pick **BAGI** (share) or **EMBAT** (steal), lock it with commit–reveal, then open simultaneously. Tagline: **"Berani khianat?"**

An on-chain trust game (split-or-steal) for **Monad testnet**. This repo is a monorepo scaffold — the game contract and UI are built in later steps.

## Stack

| Package | What | Tech |
|---|---|---|
| `contracts/` | Smart contracts | Foundry · Solidity `^0.8.24` |
| `web/` | Frontend | Next.js 14 (App Router, TS) · Tailwind v3 · wagmi v2 · viem · RainbowKit |

**Network:** Monad testnet — chainId **10143**, native currency **MON** (18 decimals), RPC `https://testnet-rpc.monad.xyz`, explorer [MonadVision](https://testnet.monadvision.com). Stake token (later): devnads test USDC (`0x56bf9CDc3C1876F3F22655a0016C2743E9e39a73`, 6 decimals).

## Prerequisites

- [Node.js](https://nodejs.org) 18+ and npm
- [Foundry](https://getfoundry.sh) (`forge`, `cast`) — `curl -L https://foundry.paradigm.xyz | bash && foundryup`

## Setup & run

### Contracts (`contracts/`)

```sh
cd contracts
forge build          # compiles; expect "Compiler run successful!"
forge test           # run tests
```

Deploy config (for later): copy the env example and fill it in.

```sh
cp .env.example .env  # set MONAD_RPC_URL and a BURNER PRIVATE_KEY (testnet only)
```

> **Key safety:** `PRIVATE_KEY` in `.env` must be a throwaway testnet burner, never a key holding mainnet funds. Prefer an encrypted keystore instead of plaintext:
> ```sh
> cast wallet import tega-burner --interactive   # paste key once, set a password
> forge script ... --account tega-burner          # key never stored in plaintext
> ```

### Web (`web/`)

```sh
cd web
cp .env.example .env            # set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (free at cloud.reown.com)
npm install
npm run dev                     # http://localhost:3000
```

The placeholder page renders a wallet **Connect** button wired to Monad testnet. Without a WalletConnect project id the page still loads; only WalletConnect-based connectors are unavailable.

## Environment variables

| Package | Var | Purpose |
|---|---|---|
| contracts | `MONAD_RPC_URL` | RPC endpoint for deploy/scripts |
| contracts | `PRIVATE_KEY` | Burner deployer key (testnet only) |
| web | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Required by RainbowKit's `getDefaultConfig` |
| web | `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed Tega address (filled after deploy) |

> Never prefix an **authenticated/keyed** RPC URL with `NEXT_PUBLIC_` — that bundles the API key into client JS. The public RPC is fine and is hardcoded in `web/lib/monadChain.ts`.

## Layout

```
play-tega/
├── contracts/   # Foundry project (default Counter.sol placeholder)
├── web/         # Next.js app (placeholder page + wallet providers)
└── README.md
```
