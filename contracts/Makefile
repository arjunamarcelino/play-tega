# TEGA contracts — build / test / deploy
#
# Secrets come from .env (MONAD_RPC_URL, PRIVATE_KEY). Copy .env.example → .env first.
# `-include` so `make build`/`make test` still work without a .env present.
-include .env
export

MONAD_RPC_URL ?= https://testnet-rpc.monad.xyz
SOURCIFY_URL  := https://sourcify-api-monad.blockvision.org

.PHONY: build test fmt clean deploy-testnet verify abi

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

## abi — regenerate web/lib/tega-abi.ts from the compiled artifact (builds first).
abi: build
	cd ../web && npm run gen:abi
