// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20ReturnFalseMock} from "@openzeppelin/contracts/mocks/token/ERC20ReturnFalseMock.sol";
import {ERC20NoReturnMock} from "@openzeppelin/contracts/mocks/token/ERC20NoReturnMock.sol";
import {ERC20Reentrant} from "@openzeppelin/contracts/mocks/token/ERC20Reentrant.sol";

/// @notice transfer/transferFrom/approve return `false` without reverting.
///         Proves SafeERC20 treats a false return as failure → `SafeERC20FailedOperation`.
contract ReturnFalseToken is ERC20ReturnFalseMock {
    constructor() ERC20("Return False", "RF") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @notice transfer/transferFrom move funds correctly but return no data (USDT-style).
///         Proves SafeERC20 ACCEPTS a no-return token (must not revert).
contract NoReturnToken is ERC20NoReturnMock {
    constructor() ERC20("No Return", "NR") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @notice Re-enters a scheduled target inside `_update` (mid-transfer). Used to
///         prove Tega's `nonReentrant` guard blocks reentry on claim/distributeJackpot.
///         ERC20Reentrant has no public mint; expose one here.
contract MockReentrantToken is ERC20Reentrant {
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
