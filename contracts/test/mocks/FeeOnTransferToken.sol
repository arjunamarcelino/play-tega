// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice ERC-20 that skims a configurable fee on transfers (not on mint/burn),
///         so the recipient receives less than `value`. Used to prove Tega's
///         `_pullStake` exact-delta guard ("bad transfer") rejects fee-on-transfer
///         tokens instead of silently shorting escrow. Set `feeBps = 0` to prove
///         the guard is an exact-delta check, not a blanket rejection of the type.
contract FeeOnTransferToken is ERC20 {
    uint256 public feeBps; // fee in basis points (100 = 1%)

    constructor(uint256 _feeBps) ERC20("Fee On Transfer", "FEE") {
        feeBps = _feeBps;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && feeBps > 0) {
            uint256 fee = (value * feeBps) / 10_000;
            super._update(from, address(0xdEaD), fee); // skim fee away from the transfer
            super._update(from, to, value - fee);
        } else {
            super._update(from, to, value);
        }
    }
}
