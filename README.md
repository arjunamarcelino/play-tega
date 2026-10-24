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

To deploy to Monad testnet, see **[Deploy to Monad testnet](#deploy-to-monad-testnet)** below.

### Web (`web/`)

```sh
cd web
cp .env.example .env            # set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (free at cloud.reown.com)
npm install
npm run dev                     # http://localhost:3000
```

The placeholder page renders a wallet **Connect** button wired to Monad testnet. Without a WalletConnect project id the page still loads; only WalletConnect-based connectors are unavailable.

## Deploy to Monad testnet

The stake token already exists on testnet (devnads test USDC) — **only `Tega` is deployed.** The deploy script (`contracts/script/Deploy.s.sol`) bakes in the USDC address and sets the admin/treasurer to the deployer by default.

### 1. Fund the deployer with testnet MON (gas)

Deploying costs **MON** (not USDC). Get the deployer's address and top it up from the faucet:

```sh
cast wallet address --private-key $PRIVATE_KEY     # the address to fund
```

- **Faucet:** <https://faucet.monad.xyz> — _(placeholder; confirm the current Monad testnet faucet)_. A small amount of MON covers the deploy.
- Monad charges gas on the **gas limit**, not gas used — a deploy needs only a little MON, but make sure the balance is non-zero.

### 2. Deploy

```sh
cd contracts
cp .env.example .env     # set MONAD_RPC_URL and a BURNER PRIVATE_KEY (testnet only)
make deploy-testnet      # broadcasts to chainId 10143 + attempts Sourcify verification
```

`make deploy-testnet` runs the forge script against `MONAD_RPC_URL`, broadcasts with `PRIVATE_KEY`, and attempts contract verification via Sourcify (`https://sourcify-api-monad.blockvision.org`). It prints the deployed **Tega address** — copy it.

> **Key safety:** `PRIVATE_KEY` must be a throwaway testnet burner, never a key holding mainnet funds. Prefer an encrypted keystore over plaintext:
> ```sh
> cast wallet import tega-burner --interactive            # paste key once, set a password
> forge script script/Deploy.s.sol:Deploy --rpc-url monad \
>   --account tega-burner --broadcast                     # key never stored in plaintext
> ```
> Overrides (optional env vars read by the script): `USDC_ADDRESS` (e.g. mainnet USDC) and `ADMIN_ADDRESS` (e.g. a treasurer multisig).

### 3. Wire the address + ABI into the web app

```sh
# From the repo root, after a deploy:
#   1. paste the printed Tega address into web/.env.local:
#        NEXT_PUBLIC_CONTRACT_ADDRESS=0x...        ← FILL IN (devnads USDC is fixed, no need to set)
#   2. regenerate the ABI from the compiled artifact (only needed if the interface changed):
cd contracts && make abi          # forge build + writes web/lib/tega/abi.ts
```

The ABI lives at `web/lib/tega/abi.ts` (typed `as const` for wagmi/viem) and is generated from `contracts/out/Tega.sol/Tega.json` by `scripts/gen-abi.mjs` (`make abi`, or `npm run gen:abi` from `web/`). `web/lib/tega/constants.ts` reads `NEXT_PUBLIC_CONTRACT_ADDRESS`; until it's set, the app runs in an unconfigured (read-only) state.

### Mainnet

Same flow against chainId **143**, wired to real USDC (`0x754704…b603`). Fund the deployer with **real MON** (~0.7 MON covers the deploy) and run:

```sh
cd contracts && make deploy-mainnet     # RPC https://rpc.monad.xyz + Sourcify verify
```

The admin/treasurer defaults to the deployer; pass `ADMIN_ADDRESS=<safe-multisig>` to use a multisig instead. Note `STAKE` is a fixed **5 USDC** constant — on mainnet that is real value.

### 4. Deployed addresses

| Network | Contract | Address |
|---|---|---|
| Monad **mainnet** (143) | **Tega** | [`0xB45A79238aD1E9A2eb85E9E2e3dd57E10FeA2aeC`](https://monadvision.com/address/0xB45A79238aD1E9A2eb85E9E2e3dd57E10FeA2aeC) _(verified)_ |
| Monad **mainnet** (143) | USDC (stake) | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` _(fixed — real USDC)_ |
| Monad **testnet** (10143) | **Tega** | [`0xB45A79238aD1E9A2eb85E9E2e3dd57E10FeA2aeC`](https://testnet.monadvision.com/address/0xB45A79238aD1E9A2eb85E9E2e3dd57E10FeA2aeC) _(verified)_ |
| Monad **testnet** (10143) | USDC (stake) | `0x56bf9CDc3C1876F3F22655a0016C2743E9e39a73` _(fixed — devnads test USDC)_ |

> Both deployments share the same address because they were created by the same deployer at nonce 0 (CREATE is deterministic).

### Players: get test USDC

Players stake **test USDC**, not MON. Claim it at **[devnads.com/tokens](https://devnads.com/tokens)**, then approve `Tega` to spend it (the app prompts for the approval). The contract never mints — each player brings their own test USDC.

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
├── contracts/   # Foundry project — src/Tega.sol + script/Deploy.s.sol + Makefile
├── scripts/     # gen-abi.mjs — exports the ABI into web/lib/tega/abi.ts
├── web/         # Next.js app — lib/tega/ integration layer + wallet providers
└── README.md
```
