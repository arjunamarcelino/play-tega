// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Tega} from "../src/Tega.sol";

/// @title Deploy TEGA to Monad
/// @notice Deploys `Tega` wired to an existing USDC stake token — no token is deployed here
///         (devnads test USDC already lives on Monad testnet).
///
/// Run (testnet):  make deploy-testnet          (see ../Makefile)
/// Or directly:    forge script script/Deploy.s.sol:Deploy --rpc-url monad --broadcast \
///                   --verify --verifier sourcify \
///                   --verifier-url https://sourcify-api-monad.blockvision.org
///
/// Env:
///   PRIVATE_KEY     deployer burner key (testnet only). If set, it signs + becomes the
///                   default admin. Omit it to sign via `--account <keystore>`/`--sender`.
///   USDC_ADDRESS    optional override for the stake token (defaults to devnads testnet USDC).
///   ADMIN_ADDRESS   optional override for the admin/treasurer (defaults to the deployer).
contract Deploy is Script {
    /// @dev devnads test USDC on Monad testnet (6 decimals). Claim at devnads.com/tokens.
    ///      Mainnet USDC is 0x754704Bc059F8C67012fEd69BC8A327a5aafb603 — pass via USDC_ADDRESS.
    address internal constant DEVNADS_USDC = 0x56bf9CDc3C1876F3F22655a0016C2743E9e39a73;

    function run() external returns (Tega tega) {
        address usdc = vm.envOr("USDC_ADDRESS", DEVNADS_USDC);

        // Resolve the signer. Prefer PRIVATE_KEY from env (Makefile path); fall back to the
        // CLI-provided signer (`--account`/`--sender`) so an encrypted keystore also works.
        uint256 pk = vm.envOr("PRIVATE_KEY", uint256(0));
        address deployer;
        if (pk != 0) {
            deployer = vm.addr(pk);
            vm.startBroadcast(pk);
        } else {
            vm.startBroadcast();
            deployer = msg.sender;
        }

        // Admin holds DEFAULT_ADMIN_ROLE + TREASURER_ROLE (jackpot control) — a multisig in prod.
        // For a testnet deploy this defaults to the deployer; override with ADMIN_ADDRESS.
        address admin = vm.envOr("ADMIN_ADDRESS", deployer);

        tega = new Tega(IERC20(usdc), admin);

        vm.stopBroadcast();

        console2.log("Tega deployed:", address(tega));
        console2.log("  stake token (USDC):", usdc);
        console2.log("  admin / treasurer :", admin);
        console2.log("  deployer          :", deployer);
    }
}
