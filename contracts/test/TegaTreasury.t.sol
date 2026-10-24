// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TegaTestBase} from "./TegaTestBase.sol";
import {Tega} from "../src/Tega.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

/// @notice Group 11 (treasury) — distributeJackpot bounds + AccessControl lifecycle.
contract TegaTreasuryTest is TegaTestBase {
    address internal recipient = makeAddr("recipient");
    address internal newTreasurer = makeAddr("newTreasurer");

    /// @dev Both-missing forfeit sends 2*STAKE to the jackpot; the contract holds it.
    function _accrueJackpot() internal returns (uint256 id) {
        id = _createAndJoin();
        vm.warp(_deadline(id) + 1);
        tega.poke(id);
        assertEq(tega.jackpot(), 2 * STAKE);
    }

    function test_Jackpot_Distribute_ByTreasurer() public {
        _accrueJackpot();
        uint256 jp = tega.jackpot();

        vm.expectEmit(true, false, false, true, address(tega));
        emit Tega.JackpotDistributed(recipient, 1_000_000);
        vm.prank(admin);
        tega.distributeJackpot(recipient, 1_000_000);

        assertEq(tega.jackpot(), jp - 1_000_000);
        assertEq(usdc.balanceOf(recipient), 1_000_000);
    }

    function test_Jackpot_Distribute_ExactBalance_Succeeds() public {
        _accrueJackpot();
        uint256 jp = tega.jackpot();
        vm.prank(admin);
        tega.distributeJackpot(recipient, jp); // amount == jackpot drains to 0
        assertEq(tega.jackpot(), 0);
        assertEq(usdc.balanceOf(recipient), jp);
    }

    function test_Jackpot_Distribute_ExceedsBalance_Reverts() public {
        _accrueJackpot();
        vm.prank(admin);
        vm.expectRevert("exceeds jackpot");
        tega.distributeJackpot(recipient, 2 * STAKE + 1);
    }

    function test_Jackpot_Distribute_ZeroTo_Reverts() public {
        _accrueJackpot();
        vm.prank(admin);
        vm.expectRevert("zero to");
        tega.distributeJackpot(address(0), 1);
    }

    function test_Jackpot_Distribute_NonTreasurer_Reverts() public {
        _accrueJackpot();
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, TREASURER_ROLE)
        );
        vm.prank(stranger);
        tega.distributeJackpot(stranger, 1);
    }

    // ---- AccessControl lifecycle ----
    function test_AccessControl_AdminCanGrantTreasurer() public {
        vm.prank(admin);
        tega.grantRole(TREASURER_ROLE, newTreasurer);
        assertTrue(tega.hasRole(TREASURER_ROLE, newTreasurer));

        _accrueJackpot();
        vm.prank(newTreasurer);
        tega.distributeJackpot(recipient, 1); // now authorized
        assertEq(usdc.balanceOf(recipient), 1);
    }

    function test_AccessControl_RevokedTreasurerLosesAccess() public {
        vm.startPrank(admin);
        tega.grantRole(TREASURER_ROLE, newTreasurer);
        tega.revokeRole(TREASURER_ROLE, newTreasurer);
        vm.stopPrank();

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, newTreasurer, TREASURER_ROLE
            )
        );
        vm.prank(newTreasurer);
        tega.distributeJackpot(recipient, 1);
    }

    function test_AccessControl_NonAdminCannotGrant_Reverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, DEFAULT_ADMIN_ROLE
            )
        );
        vm.prank(stranger);
        tega.grantRole(TREASURER_ROLE, stranger);
    }

    function test_AccessControl_AdminSelfRevoke() public {
        // Documents the single-admin footgun: admin can drop its own treasurer role.
        vm.prank(admin);
        tega.revokeRole(TREASURER_ROLE, admin);
        assertFalse(tega.hasRole(TREASURER_ROLE, admin));
    }
}
