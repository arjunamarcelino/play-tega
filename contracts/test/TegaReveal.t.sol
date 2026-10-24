// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TegaTestBase} from "./TegaTestBase.sol";
import {Tega} from "../src/Tega.sol";

/// @notice Group 4 — commit/reveal correctness (spec §9 C6).
contract TegaRevealTest is TegaTestBase {
    bytes32 internal constant SALT1 = keccak256("salt-p1");
    bytes32 internal constant SALT2 = keccak256("salt-p2");

    /// @dev Create, join, and bring the match to the Reveal phase (both committed Bagi).
    function _toReveal() internal returns (uint256 id) {
        id = _createAndJoin();
        _commit(id, 1, p1, Tega.Choice.Bagi, SALT1);
        _commit(id, 1, p2, Tega.Choice.Bagi, SALT2);
        assertEq(uint8(_phase(id)), uint8(Tega.Phase.Reveal));
    }

    function test_Reveal_WrongSalt_Reverts() public {
        uint256 id = _toReveal();
        vm.prank(p1);
        vm.expectRevert("bad reveal");
        tega.reveal(id, Tega.Choice.Bagi, keccak256("wrong-salt"));
    }

    function test_Reveal_WrongChoice_Reverts() public {
        uint256 id = _toReveal();
        vm.prank(p1);
        vm.expectRevert("bad reveal"); // committed Bagi, revealing Steal
        tega.reveal(id, Tega.Choice.Steal, SALT1);
    }

    function test_Reveal_Correct_Passes() public {
        uint256 id = _toReveal();
        vm.expectEmit(false, false, false, true, address(tega));
        emit Tega.Revealed(id, 1, p1, Tega.Choice.Bagi);
        _reveal(id, 1, p1, Tega.Choice.Bagi, SALT1);
    }

    function test_Reveal_ChoiceNone_Reverts() public {
        uint256 id = _toReveal();
        vm.prank(p1);
        vm.expectRevert("bad choice"); // checked before the hash
        tega.reveal(id, Tega.Choice.None, SALT1);
    }

    function test_Reveal_CanRetryWithinWindow() public {
        uint256 id = _toReveal();
        vm.prank(p1);
        vm.expectRevert("bad reveal");
        tega.reveal(id, Tega.Choice.Bagi, keccak256("oops"));
        // correct reveal still works afterward (revealOf untouched by the failed attempt)
        _reveal(id, 1, p1, Tega.Choice.Bagi, SALT1);
    }
}
