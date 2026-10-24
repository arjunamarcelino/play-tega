// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TegaTestBase} from "./TegaTestBase.sol";
import {Tega} from "../src/Tega.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC20Reentrant} from "@openzeppelin/contracts/mocks/token/ERC20Reentrant.sol";
import {MockReentrantToken} from "./mocks/BrokenTokens.sol";

/// @notice Group 12 — the nonReentrant guard on claim/distributeJackpot is exercised,
///         not just assumed present. The token re-enters mid-transfer; the guard must revert.
contract TegaReentrancyTest is TegaTestBase {
    MockReentrantToken internal evil;
    Tega internal et;

    function setUp() public override {
        super.setUp();
        evil = new MockReentrantToken();
        et = new Tega(IERC20(address(evil)), admin);
        evil.mint(p1, 1_000_000_000);
        evil.mint(p2, 1_000_000_000);
        vm.prank(p1);
        evil.approve(address(et), type(uint256).max);
        vm.prank(p2);
        evil.approve(address(et), type(uint256).max);
    }

    function _deadlineOf(uint256 id) internal view returns (uint64 d) {
        (,,,,, d,,,,) = et.matches(id);
    }

    function test_Reentrancy_Claim_BlockedByGuard() public {
        // One-sided forfeit → p1 has a positive payout to claim.
        vm.prank(p1);
        uint256 id = et.createMatch(address(0));
        vm.prank(p2);
        et.joinMatch(id);
        bytes32 salt = keccak256("re");
        vm.prank(p1);
        et.commit(id, keccak256(abi.encodePacked(Tega.Choice.Bagi, salt, id, uint8(1), p1)));
        vm.warp(_deadlineOf(id) + 1);
        et.poke(id); // p1 payout 2*STAKE, Ended

        // Schedule reentry into claim immediately before the claim under test.
        evil.scheduleReenter(ERC20Reentrant.Type.Before, address(et), abi.encodeCall(et.claim, (id)));
        vm.prank(p1);
        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        et.claim(id);
    }

    function test_Reentrancy_DistributeJackpot_BlockedByGuard() public {
        // Both-missing forfeit → jackpot = 2*STAKE.
        vm.prank(p1);
        uint256 id = et.createMatch(address(0));
        vm.prank(p2);
        et.joinMatch(id);
        vm.warp(_deadlineOf(id) + 1);
        et.poke(id);
        assertEq(et.jackpot(), 2 * STAKE);

        // distributeJackpot runs onlyRole BEFORE nonReentrant, so the re-entering token must
        // hold TREASURER_ROLE to get past the role check and actually exercise the guard.
        vm.prank(admin);
        et.grantRole(TREASURER_ROLE, address(evil));

        address rec = makeAddr("rec");
        evil.scheduleReenter(ERC20Reentrant.Type.Before, address(et), abi.encodeCall(et.distributeJackpot, (rec, 1)));
        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        vm.prank(admin);
        et.distributeJackpot(rec, 1);
    }
}
