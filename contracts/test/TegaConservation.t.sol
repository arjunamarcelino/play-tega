// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TegaTestBase} from "./TegaTestBase.sol";
import {Tega} from "../src/Tega.sol";

/// @notice Group 8 (P0 conservation regressions + dust) and Group 13 (cross-match).
contract TegaConservationTest is TegaTestBase {
    bytes32 internal constant S1 = keccak256("cons-p1");
    bytes32 internal constant S2 = keccak256("cons-p2");

    /// @dev The P0 fix: a mutual-steal round accrues jackpot; a later both-forfeit must
    ///      absorb only the REMAINING escrow, never a fresh 2*STAKE (which would leave
    ///      the jackpot unbacked). sum(payouts) + jackpot must still equal 2*STAKE.
    function test_Conservation_MutualStealThenCommitTimeout() public {
        uint256 id = _createAndJoin();
        uint256 a1 = tega.ante(1);
        _playRoundContinue(id, 1, Tega.Choice.Steal, Tega.Choice.Steal); // jackpot += 2*a1
        assertEq(tega.jackpot(), 2 * a1);

        // Round 2: both silent -> both forfeit.
        vm.warp(_deadline(id) + 1);
        tega.poke(id);

        (int256 s1, int256 s2) = _scores(id);
        assertEq(s1, -int256(STAKE));
        assertEq(s2, -int256(STAKE));
        assertEq(tega.jackpot(), 2 * STAKE, "jackpot absorbs only remaining, totals 2*STAKE");
        _assertConservation(id);
    }

    function test_Conservation_MutualStealThenRevealTimeout_OneSided() public {
        uint256 id = _createAndJoin();
        uint256 a1 = tega.ante(1);
        _playRoundContinue(id, 1, Tega.Choice.Steal, Tega.Choice.Steal);

        // Round 2: both commit, only p1 reveals, p2 forfeits.
        _commit(id, 2, p1, Tega.Choice.Bagi, S1);
        _commit(id, 2, p2, Tega.Choice.Bagi, S2);
        _reveal(id, 2, p1, Tega.Choice.Bagi, S1);
        vm.warp(_deadline(id) + 1);
        tega.poke(id);

        (int256 s1, int256 s2) = _scores(id);
        // honest p1 absorbs remaining = STAKE + oldS2; oldS1 = oldS2 = -a1
        assertEq(s1, int256(STAKE) - 2 * int256(a1));
        assertEq(s2, -int256(STAKE));
        assertEq(tega.jackpot(), 2 * a1, "one-sided forfeit leaves jackpot untouched");
        _assertConservation(id);
    }

    /// @dev Loser of all 8 rounds ends at -(Σ ante) = -4,999,996; payout is the 4-unit dust.
    function test_Dust_LoserAllRounds_Payout4() public {
        uint256 id = _createAndJoin();
        for (uint8 r = 1; r <= 7; r++) {
            _playRoundContinue(id, r, Tega.Choice.Bagi, Tega.Choice.Steal); // p1 loses every round
        }
        _playRoundContinue(id, 8, Tega.Choice.Bagi, Tega.Choice.Steal); // MAX end

        (int256 s1, int256 s2) = _scores(id);
        assertEq(s1, -4_999_996, "loser score == -(STAKE - 4)");
        assertEq(s2, 4_999_996);
        assertEq(_payout(s1), 4, "loser payout == dust");
        assertEq(_payout(s2), 9_999_996);
        assertEq(tega.jackpot(), 0);

        uint256 bal1 = usdc.balanceOf(p1);
        vm.prank(p1);
        tega.claim(id);
        assertEq(usdc.balanceOf(p1) - bal1, 4, "loser claims exactly 4");
    }

    /// @dev Two matches on one contract: global token balance must equal the sum of all
    ///      unclaimed payouts + jackpot (no cross-match escrow leakage).
    function test_Conservation_TwoConcurrentMatches_Isolated() public {
        uint256 id1 = _createAndJoin();
        uint256 id2 = _createAndJoin();

        // m1: one-sided commit timeout (p1 honest).
        _commit(id1, 1, p1, Tega.Choice.Bagi, S1);
        // m2: both silent.
        vm.warp(_max(_deadline(id1), _deadline(id2)) + 1);
        tega.poke(id1);
        tega.poke(id2);

        (int256 a1, int256 a2) = _scores(id1);
        (int256 b1, int256 b2) = _scores(id2);
        uint256 outstanding = _payout(a1) + _payout(a2) + _payout(b1) + _payout(b2) + tega.jackpot();
        assertEq(outstanding, 4 * STAKE, "two matches conserve to 4*STAKE");
        assertEq(usdc.balanceOf(address(tega)), 4 * STAKE, "contract holds exactly what it owes");
        assertEq(usdc.balanceOf(address(tega)), outstanding);
    }

    function _max(uint64 x, uint64 y) private pure returns (uint64) {
        return x > y ? x : y;
    }
}
