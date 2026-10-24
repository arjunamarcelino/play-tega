// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TegaTestBase} from "./TegaTestBase.sol";
import {Tega} from "../src/Tega.sol";

/// @notice Group 7 — timeouts via poke (spec §9 C2–C5), deadline boundaries,
///         and poke on every terminal state.
contract TegaTimeoutsTest is TegaTestBase {
    bytes32 internal constant S1 = keccak256("to-p1");
    bytes32 internal constant S2 = keccak256("to-p2");

    function _commitBoth(uint256 id) internal {
        _commit(id, 1, p1, Tega.Choice.Bagi, S1);
        _commit(id, 1, p2, Tega.Choice.Bagi, S2);
    }

    // ---- C2: commit timeout, one missing ----
    function test_Poke_CommitTimeout_OneMissing() public {
        uint256 id = _createAndJoin();
        _commit(id, 1, p1, Tega.Choice.Bagi, S1); // p2 stays silent
        vm.warp(_deadline(id) + 1);
        tega.poke(id);

        (int256 s1, int256 s2) = _scores(id);
        assertEq(s1, int256(STAKE), "honest p1 absorbs remaining");
        assertEq(s2, -int256(STAKE), "no-show p2 zeroed");
        assertEq(tega.betrays(p2), 1);
        assertEq(uint8(_phase(id)), uint8(Tega.Phase.Ended));
        assertEq(tega.jackpot(), 0);

        // claim-after-forfeit actually moves the money
        uint256 bal1 = usdc.balanceOf(p1);
        vm.prank(p1);
        tega.claim(id);
        assertEq(usdc.balanceOf(p1) - bal1, 2 * STAKE, "p1 gets full escrow");
        vm.prank(p2);
        tega.claim(id); // payout 0, must not revert
    }

    // ---- C3: commit timeout, both missing ----
    function test_Poke_CommitTimeout_BothMissing() public {
        uint256 id = _createAndJoin();
        vm.warp(_deadline(id) + 1);
        tega.poke(id);

        (int256 s1, int256 s2) = _scores(id);
        assertEq(s1, -int256(STAKE));
        assertEq(s2, -int256(STAKE));
        assertEq(tega.jackpot(), 2 * STAKE, "both forfeit -> jackpot");
        assertEq(tega.betrays(p1), 1);
        assertEq(tega.betrays(p2), 1);
        _assertConservation(id);
    }

    // ---- C4: reveal timeout, one missing ----
    function test_Poke_RevealTimeout_OneMissing() public {
        uint256 id = _createAndJoin();
        _commitBoth(id); // -> Reveal phase
        _reveal(id, 1, p1, Tega.Choice.Bagi, S1); // p2 stays silent
        vm.warp(_deadline(id) + 1);
        tega.poke(id);

        (int256 s1, int256 s2) = _scores(id);
        assertEq(s1, int256(STAKE));
        assertEq(s2, -int256(STAKE));
        assertEq(tega.coops(p1), 1, "honest revealer credited for real Bagi");
        assertEq(tega.betrays(p2), 1, "no-show penalized");
        assertEq(uint8(_phase(id)), uint8(Tega.Phase.Ended));
    }

    // ---- C5: reveal timeout, both missing ----
    function test_Poke_RevealTimeout_BothMissing() public {
        uint256 id = _createAndJoin();
        _commitBoth(id);
        vm.warp(_deadline(id) + 1);
        tega.poke(id);

        (int256 s1, int256 s2) = _scores(id);
        assertEq(s1, -int256(STAKE));
        assertEq(s2, -int256(STAKE));
        assertEq(tega.jackpot(), 2 * STAKE);
        _assertConservation(id);
    }

    // ---- guards / permissionless ----
    function test_Poke_BeforeDeadline_Reverts() public {
        uint256 id = _createAndJoin();
        _commit(id, 1, p1, Tega.Choice.Bagi, S1);
        vm.expectRevert("not expired");
        tega.poke(id);
    }

    function test_Poke_IsPermissionless() public {
        uint256 id = _createAndJoin();
        _commit(id, 1, p1, Tega.Choice.Bagi, S1);
        vm.warp(_deadline(id) + 1);
        vm.prank(stranger); // anyone can poke
        tega.poke(id);
        assertEq(uint8(_phase(id)), uint8(Tega.Phase.Ended));
    }

    function test_Poke_WrongPhase_WaitP2_Reverts() public {
        vm.prank(p1);
        uint256 id = tega.createMatch(address(0)); // never joined -> WaitP2
        vm.expectRevert("nothing to poke");
        tega.poke(id);
    }

    // ---- deadline boundaries (<= commit/reveal, > poke) ----
    function test_Commit_AtExactDeadline_Succeeds() public {
        uint256 id = _createAndJoin();
        vm.warp(_deadline(id)); // exactly at deadline: `<=` allows it
        _commit(id, 1, p1, Tega.Choice.Bagi, S1);
    }

    function test_Reveal_AtExactDeadline_Succeeds() public {
        uint256 id = _createAndJoin();
        _commitBoth(id);
        vm.warp(_deadline(id)); // exactly at reveal deadline: allowed
        _reveal(id, 1, p1, Tega.Choice.Bagi, S1);
    }

    function test_Reveal_AfterDeadline_Reverts() public {
        uint256 id = _createAndJoin();
        _commitBoth(id);
        vm.warp(_deadline(id) + 1);
        vm.prank(p1);
        vm.expectRevert("reveal over"); // laggard can't dodge the forfeit
        tega.reveal(id, Tega.Choice.Bagi, S1);
    }

    function test_Poke_AtExactDeadline_Reverts() public {
        uint256 id = _createAndJoin();
        _commit(id, 1, p1, Tega.Choice.Bagi, S1);
        vm.warp(_deadline(id)); // strict `>` means == is not expired
        vm.expectRevert("not expired");
        tega.poke(id);
    }

    // ---- poke after every terminal state ----
    function test_Poke_DoublePoke_Reverts() public {
        uint256 id = _createAndJoin();
        vm.warp(_deadline(id) + 1);
        tega.poke(id); // -> Ended
        vm.expectRevert("nothing to poke");
        tega.poke(id);
    }

    function test_Poke_AfterNaturalEnd_Reverts() public {
        uint256 id = _createAndJoin();
        for (uint8 r = 1; r <= 7; r++) {
            _playRoundContinue(id, r, Tega.Choice.Bagi, Tega.Choice.Bagi);
        }
        _playRoundContinue(id, 8, Tega.Choice.Bagi, Tega.Choice.Bagi); // natural MAX end
        vm.warp(block.timestamp + 100);
        vm.expectRevert("nothing to poke");
        tega.poke(id);
    }

    function test_Poke_OnCancelled_Reverts() public {
        vm.prank(p1);
        uint256 id = tega.createMatch(address(0));
        vm.prank(p1);
        tega.cancel(id);
        vm.expectRevert("nothing to poke");
        tega.poke(id);
    }
}
