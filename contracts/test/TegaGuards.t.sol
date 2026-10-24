// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TegaTestBase} from "./TegaTestBase.sol";
import {Tega} from "../src/Tega.sol";

/// @notice Group 9 — lifecycle/round guards + uncreated-id regressions across the surface.
contract TegaGuardsTest is TegaTestBase {
    bytes32 internal constant S1 = keccak256("g-p1");
    bytes32 internal constant S2 = keccak256("g-p2");
    uint256 internal constant GHOST = 999; // never created

    function _endByForfeit(uint256 id) internal {
        vm.warp(_deadline(id) + 1);
        tega.poke(id); // both missing -> Ended
    }

    // ---- join / create guards ----
    function test_Guard_JoinUncreatedId_Reverts() public {
        vm.prank(p2);
        vm.expectRevert("no match");
        tega.joinMatch(GHOST);
    }

    function test_Guard_SelfMatch_Reverts() public {
        vm.prank(p1);
        uint256 id = tega.createMatch(address(0));
        vm.prank(p1);
        vm.expectRevert(bytes("self")); // 4-char literal is ambiguous bytes/bytes4 without the cast
        tega.joinMatch(id);
    }

    function test_Guard_InvitedCanJoin() public {
        vm.prank(p1);
        uint256 id = tega.createMatch(p2); // invited-only
        vm.prank(p2);
        tega.joinMatch(id);
        assertEq(uint8(_phase(id)), uint8(Tega.Phase.Commit));
    }

    function test_Guard_JoinNotInvited_Reverts() public {
        vm.prank(p1);
        uint256 id = tega.createMatch(p2);
        vm.prank(stranger);
        vm.expectRevert("not invited");
        tega.joinMatch(id);
    }

    function test_Guard_JoinNotOpen_Reverts() public {
        uint256 id = _createAndJoin();
        vm.prank(stranger);
        vm.expectRevert("not open");
        tega.joinMatch(id);
    }

    // ---- commit guards ----
    function test_Guard_DoubleCommit_Reverts() public {
        uint256 id = _createAndJoin();
        _commit(id, 1, p1, Tega.Choice.Bagi, S1);
        vm.prank(p1);
        vm.expectRevert("already");
        tega.commit(id, _commitHash(id, 1, p1, Tega.Choice.Steal, S1));
    }

    function test_Guard_ZeroCommitHash_Reverts() public {
        uint256 id = _createAndJoin();
        vm.prank(p1);
        vm.expectRevert("bad commit");
        tega.commit(id, bytes32(0));
    }

    function test_Guard_CommitWrongPhase_Reverts() public {
        vm.prank(p1);
        uint256 id = tega.createMatch(address(0)); // WaitP2, not joined
        vm.prank(p1);
        vm.expectRevert("not commit phase");
        tega.commit(id, _commitHash(id, 1, p1, Tega.Choice.Bagi, S1));
    }

    function test_Guard_CommitAfterDeadline_Reverts() public {
        uint256 id = _createAndJoin();
        vm.warp(_deadline(id) + 1);
        vm.prank(p1);
        vm.expectRevert("commit over");
        tega.commit(id, _commitHash(id, 1, p1, Tega.Choice.Bagi, S1));
    }

    function test_Guard_NonPlayerCommit_Reverts() public {
        uint256 id = _createAndJoin();
        vm.prank(stranger);
        vm.expectRevert("not player");
        tega.commit(id, _commitHash(id, 1, stranger, Tega.Choice.Bagi, S1));
    }

    // ---- reveal guards ----
    function test_Guard_DoubleReveal_Reverts() public {
        uint256 id = _createAndJoin();
        _commit(id, 1, p1, Tega.Choice.Bagi, S1);
        _commit(id, 1, p2, Tega.Choice.Bagi, S2);
        _reveal(id, 1, p1, Tega.Choice.Bagi, S1);
        vm.prank(p1);
        vm.expectRevert("revealed");
        tega.reveal(id, Tega.Choice.Bagi, S1);
    }

    function test_Guard_RevealWrongPhase_Reverts() public {
        uint256 id = _createAndJoin();
        _commit(id, 1, p1, Tega.Choice.Bagi, S1); // phase still Commit (p2 hasn't)
        vm.prank(p1);
        vm.expectRevert("not reveal phase");
        tega.reveal(id, Tega.Choice.Bagi, S1);
    }

    function test_Guard_NonPlayerReveal_RevertsBadReveal() public {
        uint256 id = _createAndJoin();
        _commit(id, 1, p1, Tega.Choice.Bagi, S1);
        _commit(id, 1, p2, Tega.Choice.Bagi, S2);
        vm.prank(stranger); // no commit on record -> hash mismatch
        vm.expectRevert("bad reveal");
        tega.reveal(id, Tega.Choice.Bagi, S1);
    }

    // ---- claim guards ----
    function test_Guard_ClaimBeforeEnded_Reverts() public {
        uint256 id = _createAndJoin();
        vm.prank(p1);
        vm.expectRevert("not ended");
        tega.claim(id);
    }

    function test_Guard_DoubleClaim_Reverts() public {
        uint256 id = _createAndJoin();
        _endByForfeit(id);
        vm.prank(p1);
        tega.claim(id);
        vm.prank(p1);
        vm.expectRevert("claimed");
        tega.claim(id);
    }

    function test_Guard_NonPlayerClaim_Reverts() public {
        uint256 id = _createAndJoin();
        _endByForfeit(id);
        vm.prank(stranger);
        vm.expectRevert("not player");
        tega.claim(id);
    }

    // ---- uncreated-id regressions (default-struct fallthrough) ----
    function test_Guard_CommitUncreatedId_Reverts() public {
        vm.prank(p1);
        vm.expectRevert("not commit phase");
        tega.commit(GHOST, keccak256("x"));
    }

    function test_Guard_RevealUncreatedId_Reverts() public {
        vm.prank(p1);
        vm.expectRevert("not reveal phase");
        tega.reveal(GHOST, Tega.Choice.Bagi, S1);
    }

    function test_Guard_PokeUncreatedId_Reverts() public {
        vm.expectRevert("nothing to poke");
        tega.poke(GHOST);
    }

    function test_Guard_ClaimUncreatedId_Reverts() public {
        vm.prank(p1);
        vm.expectRevert("not ended");
        tega.claim(GHOST);
    }

    function test_Guard_CancelUncreatedId_Reverts() public {
        vm.prank(p1);
        vm.expectRevert("not p1");
        tega.cancel(GHOST);
    }
}
