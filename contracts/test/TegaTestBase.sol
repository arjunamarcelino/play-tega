// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Tega} from "../src/Tega.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

/// @notice Shared fixture + helpers for the Tega test suite. Concrete group
///         contracts inherit this; `setUp` deploys a fresh contract + funded
///         players for every test.
abstract contract TegaTestBase is Test {
    Tega internal tega;
    MockUSDC internal usdc;

    address internal admin = makeAddr("admin");
    address internal p1 = makeAddr("p1");
    address internal p2 = makeAddr("p2");
    address internal stranger = makeAddr("stranger");

    // Mirror of Tega constants (readability; asserted against the contract in TegaConstants).
    uint256 internal constant STAKE = 5_000_000;
    uint8 internal constant MAX_ROUNDS = 8;
    uint8 internal constant MIN_ROUNDS = 3;
    uint8 internal constant END_PROB = 25;
    uint64 internal constant COMMIT_WIN = 15;
    uint64 internal constant REVEAL_WIN = 10;

    // Role ids as constants (avoid an external call that would consume a pending vm.prank).
    bytes32 internal constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;

    function setUp() public virtual {
        usdc = new MockUSDC();
        tega = new Tega(IERC20(address(usdc)), admin);
        _fund(p1);
        _fund(p2);
    }

    // ---- fixture ----

    function _fund(address who) internal {
        usdc.mint(who, 1_000_000_000); // 1,000 USDC
        vm.prank(who);
        usdc.approve(address(tega), type(uint256).max);
    }

    function _createAndJoin() internal returns (uint256 id) {
        vm.prank(p1);
        id = tega.createMatch(address(0));
        vm.prank(p2);
        tega.joinMatch(id);
    }

    // ---- commit / reveal ----

    function _commitHash(uint256 id, uint8 round, address who, Tega.Choice c, bytes32 salt)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(c, salt, id, round, who));
    }

    function _commit(uint256 id, uint8 round, address who, Tega.Choice c, bytes32 salt) internal {
        vm.prank(who);
        tega.commit(id, _commitHash(id, round, who, c, salt));
    }

    function _reveal(uint256 id, uint8, /* round (symmetry with _commit) */ address who, Tega.Choice c, bytes32 salt)
        internal
    {
        vm.prank(who);
        tega.reveal(id, c, salt);
    }

    function _saltP1(uint256 id, uint8 round) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("tega-p1", id, round));
    }

    /// @dev Salt-based random endpoint is `keccak256(saltP1, saltP2, id, round) % 100 < END_PROB`.
    ///      Fix p1's salt, grind p2's so the round ends (`wantEnd`) or continues. Rounds below
    ///      MIN_ROUNDS never evaluate this branch, so grinding is only needed in [MIN, MAX).
    function _grindSalt(uint256 id, uint8 round, bytes32 salt1, bool wantEnd) internal pure returns (bytes32) {
        for (uint256 i = 0; i < 512; i++) {
            bytes32 salt2 = bytes32(i);
            uint256 seed = uint256(keccak256(abi.encodePacked(salt1, salt2, id, round)));
            if ((seed % 100 < END_PROB) == wantEnd) return salt2;
        }
        revert("grind: no salt found in 512 iterations");
    }

    /// @dev Play one full round (both commit, both reveal). For rounds in [MIN, MAX) the p2 salt
    ///      is ground to force continuation (default) or an early random end when `forceEnd`.
    function _playRound(uint256 id, uint8 round, Tega.Choice c1, Tega.Choice c2, bool forceEnd) internal {
        bytes32 salt1 = _saltP1(id, round);
        bytes32 salt2;
        if (round >= MIN_ROUNDS && round < MAX_ROUNDS) {
            salt2 = _grindSalt(id, round, salt1, forceEnd);
        } else {
            salt2 = keccak256(abi.encodePacked("tega-p2", id, round));
        }
        _commit(id, round, p1, c1, salt1);
        _commit(id, round, p2, c2, salt2);
        _reveal(id, round, p1, c1, salt1);
        _reveal(id, round, p2, c2, salt2);
    }

    /// @dev Play a round that will NOT randomly end (continues unless it's MAX_ROUNDS).
    function _playRoundContinue(uint256 id, uint8 round, Tega.Choice c1, Tega.Choice c2) internal {
        _playRound(id, round, c1, c2, false);
    }

    // ---- accounting ----

    function _payout(int256 score) internal pure returns (uint256) {
        return uint256(int256(STAKE) + score);
    }

    /// @dev payout1 + payout2 + jackpot == 2*STAKE. Valid for a single-match context
    ///      (fresh contract, one match) since `jackpot` is global.
    function _assertConservation(uint256 id) internal view {
        (,,,,,,, , int256 s1, int256 s2) = tega.matches(id);
        assertEq(_payout(s1) + _payout(s2) + tega.jackpot(), 2 * STAKE, "conservation");
    }

    // ---- readable match accessors ----

    function _phase(uint256 id) internal view returns (Tega.Phase ph) {
        (,,, ph,,,,,,) = tega.matches(id);
    }

    function _round(uint256 id) internal view returns (uint8 r) {
        (,,,, r,,,,,) = tega.matches(id);
    }

    function _deadline(uint256 id) internal view returns (uint64 d) {
        (,,,,, d,,,,) = tega.matches(id);
    }

    function _scores(uint256 id) internal view returns (int256 s1, int256 s2) {
        (,,,,,,, , s1, s2) = tega.matches(id);
    }
}
