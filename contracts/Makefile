# TEGA contracts — build / test / deploy
#
# Secrets come from .env (MONAD_RPC_URL, PRIVATE_KEY). Copy .env.example → .env first.
# `-include` so `make build`/`make test` still work without a .env present.
-include .env
export

MONAD_RPC_URL   ?= https://testnet-rpc.monad.xyz
MAINNET_RPC_URL ?= https://rpc.monad.xyz
SOURCIFY_URL    := https://sourcify-api-monad.blockvision.org
MAINNET_USDC    := 0x754704Bc059F8C67012fEd69BC8A327a5aafb603

.PHONY: build test fmt clean deploy-testnet deploy-mainnet abi

build:
	forge build

test:
	forge test

fmt:
	forge fmt

clean:
	forge clean

## deploy-testnet — deploy Tega to Monad testnet (chainId 10143) and attempt Sourcify verification.
## Needs PRIVATE_KEY (funded burner) + MONAD_RPC_URL in .env. USDC = devnads test USDC (baked into the script).
deploy-testnet:
	forge script script/Deploy.s.sol:Deploy \
		--rpc-url $(MONAD_RPC_URL) \
		--broadcast \
		--verify \
		--verifier sourcify \
		--verifier-url $(SOURCIFY_URL)

## deploy-mainnet — deploy Tega to Monad MAINNET (chainId 143) wired to real USDC + Sourcify verify.
## admin/treasurer defaults to the deployer (set ADMIN_ADDRESS=<safe> to use a multisig instead).
## Needs PRIVATE_KEY (funded with real MON) + MAINNET_RPC_URL. Real funds — double-check before running.
deploy-mainnet:
	USDC_ADDRESS=$(MAINNET_USDC) \
	forge script script/Deploy.s.sol:Deploy \
		--rpc-url $(MAINNET_RPC_URL) \
		--broadcast \
		--verify \
		--verifier sourcify \
		--verifier-url $(SOURCIFY_URL)

## abi — regenerate web/lib/tega-abi.ts from the compiled artifact (builds first).
abi: build
	cd ../web && npm run gen:abi
