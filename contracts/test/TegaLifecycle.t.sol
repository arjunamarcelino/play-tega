// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TegaTestBase} from "./TegaTestBase.sol";
import {Tega} from "../src/Tega.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Group 11 — cancel (C1), constructor, reputation / trustScore.
contract TegaLifecycleTest is TegaTestBase {
    // ---- cancel ----
    function test_Cancel_RefundsStake() public {
        uint256 bal = usdc.balanceOf(p1);
        vm.prank(p1);
        uint256 id = tega.createMatch(address(0));
        assertEq(usdc.balanceOf(p1), bal - STAKE, "staked");

        vm.expectEmit(false, false, false, true, address(tega));
        emit Tega.MatchCancelled(id);
        vm.prank(p1);
        tega.cancel(id);

        assertEq(usdc.balanceOf(p1), bal, "refunded");
        assertEq(uint8(_phase(id)), uint8(Tega.Phase.Cancelled));
    }

    function test_Cancel_NotP1_Reverts() public {
        vm.prank(p1);
        uint256 id = tega.createMatch(address(0));
        vm.prank(stranger);
        vm.expectRevert("not p1");
        tega.cancel(id);
    }

    function test_Cancel_AfterP2Joined_Reverts() public {
        uint256 id = _createAndJoin();
        vm.prank(p1);
        vm.expectRevert("not cancelable");
        tega.cancel(id);
    }

    function test_Cancel_SelfInvite_StillCancelable() public {
        // Footgun: inviting yourself makes the match unjoinable (join reverts "self"),
        // but cancel still recovers the stake.
        vm.prank(p1);
        uint256 id = tega.createMatch(p1);
        vm.prank(p1);
        vm.expectRevert(bytes("self"));
        tega.joinMatch(id);
        vm.prank(p1);
        tega.cancel(id);
        assertEq(uint8(_phase(id)), uint8(Tega.Phase.Cancelled));
    }

    // ---- constructor ----
    function test_Constructor_ZeroAdmin_Reverts() public {
        vm.expectRevert("zero admin");
        new Tega(IERC20(address(usdc)), address(0));
    }

    function test_Constructor_GrantsRoles() public view {
        assertTrue(tega.hasRole(tega.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(tega.hasRole(tega.TREASURER_ROLE(), admin));
    }

    /// @dev Guard against the test mirror drifting from the real contract constants.
    function test_Constants_MirrorContract() public view {
        assertEq(tega.STAKE(), STAKE);
        assertEq(tega.MAX_ROUNDS(), MAX_ROUNDS);
        assertEq(tega.MIN_ROUNDS(), MIN_ROUNDS);
        assertEq(tega.END_PROB(), END_PROB);
        assertEq(tega.COMMIT_WIN(), COMMIT_WIN);
        assertEq(tega.REVEAL_WIN(), REVEAL_WIN);
        assertEq(tega.TREASURER_ROLE(), TREASURER_ROLE);
        assertEq(tega.DEFAULT_ADMIN_ROLE(), DEFAULT_ADMIN_ROLE);
    }

    // ---- reputation / trustScore ----
    function test_TrustScore_DefaultsTo100() public view {
        assertEq(tega.trustScore(stranger), 100, "no history defaults to 100");
    }

    function test_TrustScore_Computation() public {
        uint256 id = _createAndJoin();
        _playRoundContinue(id, 1, Tega.Choice.Bagi, Tega.Choice.Bagi); // p1 coop
        _playRoundContinue(id, 2, Tega.Choice.Steal, Tega.Choice.Bagi); // p1 betray
        assertEq(tega.coops(p1), 1);
        assertEq(tega.betrays(p1), 1);
        assertEq(tega.trustScore(p1), 50, "1 coop / 2 total");
        assertEq(tega.trustScore(p2), 100, "p2 cooperated twice");
    }

    function test_Reputation_BetrayedCooperator_GetsCoopCredit() public {
        uint256 id = _createAndJoin();
        _playRoundContinue(id, 1, Tega.Choice.Bagi, Tega.Choice.Steal); // p1 betrayed but cooperated
        assertEq(tega.coops(p1), 1, "cooperator credited even when betrayed");
        assertEq(tega.betrays(p1), 0);
        assertEq(tega.trustScore(p1), 100);
        assertEq(tega.betrays(p2), 1, "betrayer marked");
    }
}
