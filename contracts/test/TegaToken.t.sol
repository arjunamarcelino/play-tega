// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TegaTestBase} from "./TegaTestBase.sol";
import {Tega} from "../src/Tega.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {FeeOnTransferToken} from "./mocks/FeeOnTransferToken.sol";
import {ReturnFalseToken, NoReturnToken} from "./mocks/BrokenTokens.sol";

/// @notice Group 10 — ERC-20 escrow (SafeERC20 + _pullStake exact-delta guard).
contract TegaTokenTest is TegaTestBase {
    function test_Token_InsufficientAllowance_Reverts() public {
        address poor = makeAddr("poorAllowance");
        usdc.mint(poor, 1_000_000_000);
        vm.prank(poor);
        usdc.approve(address(tega), STAKE - 1);
        vm.prank(poor);
        vm.expectRevert(); // ERC20InsufficientAllowance — assert reverts, not a specific shape
        tega.createMatch(address(0));
    }

    function test_Token_InsufficientBalance_Reverts() public {
        address broke = makeAddr("brokeBalance");
        usdc.mint(broke, STAKE - 1);
        vm.prank(broke);
        usdc.approve(address(tega), type(uint256).max);
        vm.prank(broke);
        vm.expectRevert(); // ERC20InsufficientBalance
        tega.createMatch(address(0));
    }

    function test_Token_FeeOnTransfer_Rejected() public {
        FeeOnTransferToken fee = new FeeOnTransferToken(100); // 1%
        Tega t = new Tega(IERC20(address(fee)), admin);
        fee.mint(p1, 1_000_000_000);
        vm.prank(p1);
        fee.approve(address(t), type(uint256).max);

        vm.prank(p1);
        vm.expectRevert("bad transfer");
        t.createMatch(address(0));

        assertEq(fee.balanceOf(address(t)), 0, "no partial escrow left after revert");
    }

    function test_Token_FeeOnTransfer_ZeroFee_Succeeds() public {
        FeeOnTransferToken fee = new FeeOnTransferToken(0); // exact transfer
        Tega t = new Tega(IERC20(address(fee)), admin);
        fee.mint(p1, 1_000_000_000);
        vm.prank(p1);
        fee.approve(address(t), type(uint256).max);

        vm.prank(p1);
        t.createMatch(address(0)); // guard is exact-delta, not a blanket type rejection
        assertEq(fee.balanceOf(address(t)), STAKE);
    }

    function test_Token_ReturnsFalse_Reverts() public {
        ReturnFalseToken rf = new ReturnFalseToken();
        Tega t = new Tega(IERC20(address(rf)), admin);
        rf.mint(p1, 1_000_000_000);
        vm.prank(p1);
        rf.approve(address(t), type(uint256).max);

        vm.prank(p1);
        vm.expectRevert(abi.encodeWithSelector(SafeERC20.SafeERC20FailedOperation.selector, address(rf)));
        t.createMatch(address(0));
    }

    function test_Token_NoReturnValue_Accepted() public {
        NoReturnToken nr = new NoReturnToken();
        Tega t = new Tega(IERC20(address(nr)), admin);
        nr.mint(p1, 1_000_000_000);
        // approve() returns no data; a high-level call would revert on return-decode, so call raw.
        vm.prank(p1);
        (bool ok,) = address(nr).call(abi.encodeWithSelector(IERC20.approve.selector, address(t), type(uint256).max));
        assertTrue(ok);

        vm.prank(p1);
        t.createMatch(address(0)); // USDT-style no-return token must be accepted
        assertEq(nr.balanceOf(address(t)), STAKE);
    }
}
