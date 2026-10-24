// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TegaTestBase} from "./TegaTestBase.sol";
import {Tega} from "../src/Tega.sol";

/// @notice Group 2 (payoff matrix) + Group 3 (escalating ante).
contract TegaPayoffTest is TegaTestBase {
    // ---- Group 2: payoff matrix (round 1, < MIN_ROUNDS so no random end) ----

    function test_Payoff_BagiBagi_ZeroDelta() public {
        uint256 id = _createAndJoin();
        _playRoundContinue(id, 1, Tega.Choice.Bagi, Tega.Choice.Bagi);
        (int256 s1, int256 s2) = _scores(id);
        assertEq(s1, 0);
        assertEq(s2, 0);
        assertEq(tega.jackpot(), 0);
    }

    function test_Payoff_StealBagi() public {
        uint256 id = _createAndJoin();
        int256 a = int256(tega.ante(1));
        _playRoundContinue(id, 1, Tega.Choice.Steal, Tega.Choice.Bagi);
        (int256 s1, int256 s2) = _scores(id);
        assertEq(s1, a);
        assertEq(s2, -a);
        assertEq(tega.jackpot(), 0);
    }

    function test_Payoff_BagiSteal() public {
        uint256 id = _createAndJoin();
        int256 a = int256(tega.ante(1));
        _playRoundContinue(id, 1, Tega.Choice.Bagi, Tega.Choice.Steal);
        (int256 s1, int256 s2) = _scores(id);
        assertEq(s1, -a);
        assertEq(s2, a);
        assertEq(tega.jackpot(), 0);
    }

    function test_Payoff_StealSteal_AccruesJackpot() public {
        uint256 id = _createAndJoin();
        uint256 a = tega.ante(1);
        _playRoundContinue(id, 1, Tega.Choice.Steal, Tega.Choice.Steal);
        (int256 s1, int256 s2) = _scores(id);
        assertEq(s1, -int256(a));
        assertEq(s2, -int256(a));
        assertEq(tega.jackpot(), 2 * a);
    }

    function test_Payoff_RoundResolved_EmitsDeltas() public {
        uint256 id = _createAndJoin();
        int256 a = int256(tega.ante(1));
        bytes32 salt1 = _saltP1(id, 1);
        bytes32 salt2 = keccak256(abi.encodePacked("tega-p2", id, uint8(1)));
        _commit(id, 1, p1, Tega.Choice.Steal, salt1);
        _commit(id, 1, p2, Tega.Choice.Bagi, salt2);
        _reveal(id, 1, p1, Tega.Choice.Steal, salt1);
        // the second reveal resolves the round and emits RoundResolved
        vm.expectEmit(false, false, false, true, address(tega));
        emit Tega.RoundResolved(id, 1, Tega.Choice.Steal, Tega.Choice.Bagi, a, -a);
        _reveal(id, 1, p2, Tega.Choice.Bagi, salt2);
    }

    // ---- Group 3: escalating ante ----

    function test_Ante_Schedule() public view {
        uint256 sum;
        for (uint8 r = 1; r <= MAX_ROUNDS; r++) {
            assertEq(tega.ante(r), (STAKE * r) / 36, "ante(r) == STAKE*r/36");
            sum += tega.ante(r);
        }
        assertEq(sum, 4_999_996, "sum ante(1..8) == STAKE - 4 dust");
    }

    function test_Ante_Monotonic() public view {
        for (uint8 r = 2; r <= MAX_ROUNDS; r++) {
            assertGe(tega.ante(r), tega.ante(r - 1));
        }
    }

    function test_Ante_AppliedPerRound() public {
        // Round 2 ante differs from round 1; a Steal/Bagi in round 2 moves exactly ante(2).
        uint256 id = _createAndJoin();
        _playRoundContinue(id, 1, Tega.Choice.Bagi, Tega.Choice.Bagi); // no-op scores
        int256 a2 = int256(tega.ante(2));
        _playRoundContinue(id, 2, Tega.Choice.Steal, Tega.Choice.Bagi);
        (int256 s1, int256 s2) = _scores(id);
        assertEq(s1, a2);
        assertEq(s2, -a2);
    }
}
