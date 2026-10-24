// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TegaTestBase} from "./TegaTestBase.sol";
import {Tega} from "../src/Tega.sol";

/// @notice Group 1 (end-to-end happy path) + the spec §5 worked-example integration test.
contract TegaHappyPathTest is TegaTestBase {
    function test_HappyPath_FullGame_BothClaim() public {
        uint256 id = _createAndJoin();

        // Play to MAX_ROUNDS forcing continuation each round; round 8 force-ends (endedRandom=false).
        _playRoundContinue(id, 1, Tega.Choice.Bagi, Tega.Choice.Steal);
        _playRoundContinue(id, 2, Tega.Choice.Steal, Tega.Choice.Bagi);
        _playRoundContinue(id, 3, Tega.Choice.Bagi, Tega.Choice.Bagi);
        _playRoundContinue(id, 4, Tega.Choice.Steal, Tega.Choice.Bagi);
        _playRoundContinue(id, 5, Tega.Choice.Bagi, Tega.Choice.Steal);
        _playRoundContinue(id, 6, Tega.Choice.Bagi, Tega.Choice.Bagi);
        _playRoundContinue(id, 7, Tega.Choice.Steal, Tega.Choice.Bagi);
        _playRoundContinue(id, 8, Tega.Choice.Bagi, Tega.Choice.Bagi); // round 8 auto-ends

        assertEq(uint8(_phase(id)), uint8(Tega.Phase.Ended), "ended at MAX_ROUNDS");

        (int256 s1, int256 s2) = _scores(id);
        uint256 payout1 = _payout(s1);
        uint256 payout2 = _payout(s2);
        assertEq(payout1 + payout2 + tega.jackpot(), 2 * STAKE, "conservation");

        uint256 bal1Before = usdc.balanceOf(p1);
        uint256 bal2Before = usdc.balanceOf(p2);

        vm.prank(p1);
        tega.claim(id);
        vm.prank(p2);
        tega.claim(id);

        assertEq(usdc.balanceOf(p1) - bal1Before, payout1, "p1 payout == STAKE + score1");
        assertEq(usdc.balanceOf(p2) - bal2Before, payout2, "p2 payout == STAKE + score2");
    }

    function test_WorkedExample_FourRounds_RandomEnd() public {
        // Spec §5 sequence: B/B, S/B, S/S, B/S then a random end after round 4.
        uint256 id = _createAndJoin();

        _playRoundContinue(id, 1, Tega.Choice.Bagi, Tega.Choice.Bagi);
        _playRoundContinue(id, 2, Tega.Choice.Steal, Tega.Choice.Bagi);
        _playRoundContinue(id, 3, Tega.Choice.Steal, Tega.Choice.Steal); // mutual steal -> jackpot

        int256 a2 = int256(tega.ante(2));
        int256 a3 = int256(tega.ante(3));
        int256 a4 = int256(tega.ante(4));
        int256 expS1 = a2 - a3 - a4; // round1 0, r2 +a2, r3 -a3, r4 -a4
        int256 expS2 = -a2 - a3 + a4;

        // Round 4 B/S, forced random end.
        bytes32 salt1 = _saltP1(id, 4);
        bytes32 salt2 = _grindSalt(id, 4, salt1, true);
        _commit(id, 4, p1, Tega.Choice.Bagi, salt1);
        _commit(id, 4, p2, Tega.Choice.Steal, salt2);
        _reveal(id, 4, p1, Tega.Choice.Bagi, salt1);

        vm.expectEmit(false, false, false, true, address(tega));
        emit Tega.GameEnded(id, expS1, expS2, true); // endedRandom == true
        _reveal(id, 4, p2, Tega.Choice.Steal, salt2);

        assertEq(uint8(_phase(id)), uint8(Tega.Phase.Ended));
        (int256 s1, int256 s2) = _scores(id);
        assertEq(s1, expS1);
        assertEq(s2, expS2);
        assertEq(tega.jackpot(), 2 * uint256(a3), "jackpot == 2*ante(3) from the mutual steal");
        _assertConservation(id);
    }
}
