// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TegaTestBase} from "./TegaTestBase.sol";
import {Tega} from "../src/Tega.sol";

/// @notice Group 5 (salt-based random endpoint) + Group 6 (MAX_ROUNDS force-end).
///         The shipped contract seeds the endpoint from revealed salts, NOT prevrandao,
///         so both branches are driven by grinding p2's salt.
contract TegaRandomEndTest is TegaTestBase {
    /// @dev Finish round `round` manually with p1=Bagi/p2=Bagi and a chosen p2 salt,
    ///      so the resolving reveal can be wrapped in expectEmit. Returns nothing;
    ///      caller sets up the expectEmit before this resolves.
    function _finishRoundBagiBagi(uint256 id, uint8 round, bytes32 salt2) internal {
        bytes32 salt1 = _saltP1(id, round);
        _commit(id, round, p1, Tega.Choice.Bagi, salt1);
        _commit(id, round, p2, Tega.Choice.Bagi, salt2);
        _reveal(id, round, p1, Tega.Choice.Bagi, salt1);
        _reveal(id, round, p2, Tega.Choice.Bagi, salt2);
    }

    function test_RandomEnd_EarlyEnd_SetsEndedRandomTrue() public {
        uint256 id = _createAndJoin();
        _playRoundContinue(id, 1, Tega.Choice.Bagi, Tega.Choice.Bagi);
        _playRoundContinue(id, 2, Tega.Choice.Bagi, Tega.Choice.Bagi);

        // Round 3 (>= MIN_ROUNDS): grind p2 salt to force a random end.
        bytes32 salt1 = _saltP1(id, 3);
        bytes32 salt2 = _grindSalt(id, 3, salt1, true);
        _commit(id, 3, p1, Tega.Choice.Bagi, salt1);
        _commit(id, 3, p2, Tega.Choice.Bagi, salt2);
        _reveal(id, 3, p1, Tega.Choice.Bagi, salt1);

        vm.expectEmit(false, false, false, true, address(tega));
        emit Tega.GameEnded(id, 0, 0, true);
        _reveal(id, 3, p2, Tega.Choice.Bagi, salt2);

        assertEq(uint8(_phase(id)), uint8(Tega.Phase.Ended));
    }

    function test_RandomEnd_Continuation() public {
        uint256 id = _createAndJoin();
        _playRoundContinue(id, 1, Tega.Choice.Bagi, Tega.Choice.Bagi);
        _playRoundContinue(id, 2, Tega.Choice.Bagi, Tega.Choice.Bagi);

        // Round 3 with a continue-forcing salt: must advance, not end.
        bytes32 salt1 = _saltP1(id, 3);
        bytes32 salt2 = _grindSalt(id, 3, salt1, false);
        _finishRoundBagiBagi(id, 3, salt2);

        assertEq(uint8(_phase(id)), uint8(Tega.Phase.Commit), "advanced to next round");
        assertEq(_round(id), 4);
    }

    function test_RandomEnd_NotBeforeMinRounds() public {
        // A salt that WOULD trigger an end if evaluated — but round 1 < MIN_ROUNDS never evaluates it.
        uint256 id = _createAndJoin();
        bytes32 salt1 = _saltP1(id, 1);
        bytes32 endSalt = _grindSalt(id, 1, salt1, true);
        _finishRoundBagiBagi(id, 1, endSalt);
        assertEq(uint8(_phase(id)), uint8(Tega.Phase.Commit), "round 1 never random-ends");
        assertEq(_round(id), 2);
    }

    function test_MaxRounds_ForceEnd_AtRound8() public {
        uint256 id = _createAndJoin();
        for (uint8 r = 1; r <= 7; r++) {
            _playRoundContinue(id, r, Tega.Choice.Bagi, Tega.Choice.Bagi);
        }
        assertEq(_round(id), 8, "reached round 8");

        // Round 8 force-ends regardless of salt, with endedRandom == false.
        bytes32 salt2 = keccak256(abi.encodePacked("r8-p2", id));
        bytes32 salt1 = _saltP1(id, 8);
        _commit(id, 8, p1, Tega.Choice.Bagi, salt1);
        _commit(id, 8, p2, Tega.Choice.Bagi, salt2);
        _reveal(id, 8, p1, Tega.Choice.Bagi, salt1);

        vm.expectEmit(false, false, false, true, address(tega));
        emit Tega.GameEnded(id, 0, 0, false); // endedRandom == false at MAX
        _reveal(id, 8, p2, Tega.Choice.Bagi, salt2);

        assertEq(uint8(_phase(id)), uint8(Tega.Phase.Ended));
    }
}
