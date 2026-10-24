// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TEGA — on-chain split-or-steal trust game
/// @notice Two players each escrow a fixed STAKE of an ERC-20 (devnads test USDC, 6-dec),
///         then play multi-round commit-reveal. Each round they secretly pick BAGI (share)
///         or EMBAT (steal); the payoff matrix moves an escalating `ante` between them.
///         The game ends on a random endpoint (after MIN_ROUNDS) or at MAX_ROUNDS, and each
///         player pulls `STAKE + score` via `claim`.
/// @dev Accounting is zero-sum: for any match, `payout1 + payout2 + jackpot == 2*STAKE`.
///      SECURITY NOTES:
///      - Designed for a standard, non-rebasing ERC-20. Stake pulls assert the exact STAKE was
///        received (`_pullStake`), so a fee-on-transfer token is rejected rather than silently
///        shorting escrow; a rebasing token is still unsupported.
///      - `jackpot` (from mutual-steal rounds and double-forfeits) is intentionally NEVER
///        distributed by this contract; those funds, and any match that never reaches
///        Ended/Cancelled, are permanently locked (no admin sweep). This is by design
///        (tournament-prize seeding happens off-chain, spec §8).
///      - No code may compare `Phase` by ordinal (`<`/`>`); all comparisons are `==`, so the
///        appended `Cancelled` value is safe.
///      - Reverts use require-strings (not custom errors) intentionally: the test suite asserts
///        exact strings, and Solidity 0.8.24 cannot use custom errors inside `require`. Migrating
///        to custom errors is a possible future gas optimization.
contract Tega is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---- types ----
    enum Choice { None, Bagi, Steal }
    enum Phase  { WaitP2, Commit, Reveal, Ended, Cancelled }

    struct Match {
        address p1;        // slot 0
        address p2;        // slot 1
        address invited;   // slot 2  ┐ 0x0 = open table; else locked to this player
        Phase   phase;     // slot 2  │ packed: 20 + 1 + 1 + 8 + 1 + 1 = 32 bytes
        uint8   round;     // slot 2  │
        uint64  deadline;  // slot 2  │
        bool    claimed1;  // slot 2  │
        bool    claimed2;  // slot 2  ┘
        int256  score1;    // slot 3
        int256  score2;    // slot 4
    }

    // ---- constants ----
    uint8   public constant MAX_ROUNDS = 8;
    uint8   public constant MIN_ROUNDS = 3;          // random endpoint only applies at/after this round
    uint8   public constant END_PROB   = 25;         // % chance each round (r>=MIN) is the last
    uint64  public constant COMMIT_WIN = 15;         // seconds (popup-wallet baseline; 12 w/ session keys)
    uint64  public constant REVEAL_WIN = 10;         // seconds (8 w/ session keys)
    uint256 public constant STAKE      = 5_000_000;  // 5 USDC (6 decimals). Σ ante(1..8) = 4_999_996 (= STAKE − 4; truncation dust is paid to players, not trapped)

    // ---- storage ----
    /// @notice The ERC-20 staked/paid out (devnads test USDC in production). Immutable: no SLOAD, cannot be reassigned.
    IERC20 public immutable token;

    mapping(uint256 => Match) public matches;
    mapping(bytes32 => bytes32) public commitOf;   // key => commit hash (nonzero = committed; zero hash rejected)
    mapping(bytes32 => Choice)  public revealOf;   // key => revealed choice

    uint256 public nextId;
    uint256 public jackpot;                        // accrued, never distributed on-chain (see @dev)

    mapping(address => uint32) public coops;       // reputation: # of BAGI plays
    mapping(address => uint32) public betrays;     // reputation: # of EMBAT plays

    // ---- events ----
    event MatchCreated(uint256 id, address p1, address indexed invited, uint256 stake);
    event PlayerJoined(uint256 id, address p2);
    event RoundStarted(uint256 id, uint8 round, uint256 ante, uint64 deadline);
    event Committed(uint256 id, uint8 round, address who);
    event Revealed(uint256 id, uint8 round, address who, Choice choice);
    event RoundResolved(uint256 id, uint8 round, Choice c1, Choice c2, int256 d1, int256 d2);
    event GameEnded(uint256 id, int256 score1, int256 score2, bool endedRandom);
    event Claimed(uint256 id, address who, uint256 amount);
    event MatchCancelled(uint256 id);

    /// @param _token the ERC-20 used for stake/payout (devnads test USDC, 6 decimals).
    constructor(IERC20 _token) {
        token = _token;
    }

    /// @notice Ante for round `r` — linear: STAKE*r/36 (Σ weights r=1..8 = 36). Integer division
    ///         truncates, so Σ ante(1..8) = 4_999_996 ≤ STAKE; conservation holds on scores (not
    ///         antes) because the winner's +A and loser's -A use the SAME truncated value.
    function ante(uint8 r) public pure returns (uint256) {
        return STAKE * r / 36;
    }

    function _key(uint256 id, uint8 r, address p) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(id, r, p));
    }

    /// @dev Pull exactly STAKE from `from` and assert the contract actually received it.
    ///      Rejects fee-on-transfer/rebasing tokens that would leave escrow short.
    function _pullStake(address from) internal {
        uint256 balBefore = token.balanceOf(address(this));
        token.safeTransferFrom(from, address(this), STAKE);
        require(token.balanceOf(address(this)) - balBefore == STAKE, "bad transfer");
    }

    // ---- lifecycle ----

    /// @notice Create a match and escrow STAKE. `invited == address(0)` → open table (joinable
    ///         by anyone with the id); otherwise locked to `invited`. Clients watch
    ///         `MatchCreated(..., invited == me)` as a challenge inbox (no backend).
    /// @dev CEI: state written before the token pull.
    function createMatch(address invited) external returns (uint256 id) {
        id = ++nextId;
        Match storage m = matches[id];
        m.p1 = msg.sender;
        m.invited = invited;
        m.phase = Phase.WaitP2;
        emit MatchCreated(id, msg.sender, invited, STAKE);
        _pullStake(msg.sender);
    }

    /// @notice Join an open/invited match and escrow STAKE; starts round 1 (Commit phase).
    /// @dev CEI: state written before the token pull. Guards (audit): existence, no self-match.
    function joinMatch(uint256 id) external {
        Match storage m = matches[id];
        require(m.p1 != address(0), "no match");
        require(m.phase == Phase.WaitP2 && m.p2 == address(0), "not open");
        require(msg.sender != m.p1, "self");
        require(m.invited == address(0) || msg.sender == m.invited, "not invited");
        m.p2 = msg.sender;
        m.round = 1;
        m.phase = Phase.Commit;
        m.deadline = uint64(block.timestamp) + COMMIT_WIN;
        emit PlayerJoined(id, msg.sender);
        emit RoundStarted(id, 1, ante(1), m.deadline);
        _pullStake(msg.sender);
    }

    /// @notice Cancel a match that no one joined; refunds p1's full STAKE. (spec §9 C1)
    /// @dev CEI: phase set to Cancelled before the refund transfer.
    function cancel(uint256 id) external {
        Match storage m = matches[id];
        require(msg.sender == m.p1, "not p1");
        require(m.phase == Phase.WaitP2 && m.p2 == address(0), "not cancelable");
        m.phase = Phase.Cancelled;
        emit MatchCancelled(id);
        token.safeTransfer(m.p1, STAKE);
    }

    // ---- rounds ----

    /// @notice Commit a hidden choice: `keccak256(abi.encodePacked(choice, salt, id, round, msg.sender))`.
    ///         Both players committing auto-advances to the Reveal phase.
    function commit(uint256 id, bytes32 commitHash) external {
        Match storage m = matches[id];
        require(m.phase == Phase.Commit, "not commit phase");
        require(block.timestamp <= m.deadline, "commit over");
        require(msg.sender == m.p1 || msg.sender == m.p2, "not player");
        require(commitHash != bytes32(0), "bad commit");       // zero reserved as "not committed" sentinel
        bytes32 k = _key(id, m.round, msg.sender);
        require(commitOf[k] == bytes32(0), "already");
        commitOf[k] = commitHash;
        emit Committed(id, m.round, msg.sender);
        if (commitOf[_key(id, m.round, m.p1)] != bytes32(0) && commitOf[_key(id, m.round, m.p2)] != bytes32(0)) {
            m.phase = Phase.Reveal;
            m.deadline = uint64(block.timestamp) + REVEAL_WIN;
        }
    }

    /// @notice Reveal a previously committed choice; both revealing resolves the round.
    /// @dev Audit fix: enforces the reveal deadline (symmetry with commit) so a laggard can't
    ///      race `poke` to dodge the forfeit.
    function reveal(uint256 id, Choice choice, bytes32 salt) external {
        Match storage m = matches[id];
        require(m.phase == Phase.Reveal, "not reveal phase");
        require(block.timestamp <= m.deadline, "reveal over");
        require(choice == Choice.Bagi || choice == Choice.Steal, "bad choice");
        bytes32 k = _key(id, m.round, msg.sender);
        require(
            commitOf[k] == keccak256(abi.encodePacked(choice, salt, id, m.round, msg.sender)),
            "bad reveal"
        );
        require(revealOf[k] == Choice.None, "revealed");
        revealOf[k] = choice;
        emit Revealed(id, m.round, msg.sender, choice);
        if (
            revealOf[_key(id, m.round, m.p1)] != Choice.None &&
            revealOf[_key(id, m.round, m.p2)] != Choice.None
        ) {
            _resolveRound(id);
        }
    }

    /// @dev Apply the payoff matrix, update reputation, accrue jackpot, then advance/end.
    ///      Reputation follows spec §7: every BAGI → coops++, every EMBAT → betrays++ (uniform
    ///      per player each round — a betrayed cooperator still earns trust credit).
    function _resolveRound(uint256 id) internal {
        Match storage m = matches[id];
        uint8 r = m.round;
        Choice c1 = revealOf[_key(id, r, m.p1)];
        Choice c2 = revealOf[_key(id, r, m.p2)];
        int256 A = int256(ante(r));
        int256 d1;
        int256 d2;

        if (c1 == Choice.Bagi && c2 == Choice.Bagi) {
            d1 = 0; d2 = 0;                                   // COOP_BONUS = 0
        } else if (c1 == Choice.Steal && c2 == Choice.Bagi) {
            d1 = A; d2 = -A;
        } else if (c1 == Choice.Bagi && c2 == Choice.Steal) {
            d1 = -A; d2 = A;
        } else {
            d1 = -A; d2 = -A;
            jackpot += uint256(2 * A);                        // both steal → pot burns to jackpot
        }

        // reputation (§7): per player, by their own choice
        if (c1 == Choice.Bagi) { coops[m.p1]++; } else { betrays[m.p1]++; }
        if (c2 == Choice.Bagi) { coops[m.p2]++; } else { betrays[m.p2]++; }

        m.score1 += d1;
        m.score2 += d2;
        emit RoundResolved(id, r, c1, c2, d1, d2);
        _advance(id);
    }

    /// @dev Random endpoint (spec §6): after MIN_ROUNDS, each round has END_PROB% chance to end;
    ///      always ends at MAX_ROUNDS.
    ///      RANDOMNESS CAVEAT: `block.prevrandao` is NOT cryptographically secure. The second
    ///      revealer (or a `poke` caller) can grind block timing across the reveal window to
    ///      bias the end/continue outcome; a block proposer has limited influence too. Acceptable
    ///      for a low-stakes testnet demo; production should use a VRF.
    function _advance(uint256 id) internal {
        Match storage m = matches[id];
        bool last = m.round >= MAX_ROUNDS;
        bool rand = false;
        if (!last && m.round >= MIN_ROUNDS) {
            uint256 seed = uint256(keccak256(abi.encodePacked(block.prevrandao, id, m.round)));
            if (seed % 100 < END_PROB) {
                last = true;
                rand = true;
            }
        }
        if (last) {
            m.phase = Phase.Ended;
            emit GameEnded(id, m.score1, m.score2, rand);
        } else {
            m.round++;
            m.phase = Phase.Commit;
            m.deadline = uint64(block.timestamp) + COMMIT_WIN;
            emit RoundStarted(id, m.round, ante(m.round), m.deadline);
        }
    }

    // ---- anti-grief: anyone can call once the deadline passes ----

    /// @notice Permissionless timeout handler: resolves a stalled match (spec §9 C2–C5).
    function poke(uint256 id) external {
        Match storage m = matches[id];
        require(m.phase == Phase.Commit || m.phase == Phase.Reveal, "nothing to poke");
        require(block.timestamp > m.deadline, "not expired");
        if (m.phase == Phase.Commit) {
            _penalize(
                id,
                commitOf[_key(id, m.round, m.p1)] != bytes32(0),
                commitOf[_key(id, m.round, m.p2)] != bytes32(0)
            );
        } else {
            _penalize(
                id,
                revealOf[_key(id, m.round, m.p1)] != Choice.None,
                revealOf[_key(id, m.round, m.p2)] != Choice.None
            );
        }
    }

    /// @dev Forfeit resolution. AUDIT FIX (conservation): the honest player absorbs the loser's
    ///      REMAINING payout (2*STAKE - jackpot-accrued-this-match), NOT a fresh 2*STAKE — so a
    ///      mutual-steal round earlier in the match can't leave the jackpot unbacked.
    ///      `J = -(score1+score2)`; honest's new score = oldScore + (STAKE + loserScore).
    function _penalize(uint256 id, bool ok1, bool ok2) internal {
        Match storage m = matches[id];
        if (ok1 && !ok2) {                                    // p1 honest, p2 no-show (C2/C4)
            m.score1 = m.score1 + (int256(STAKE) + m.score2); // += loser's remaining payout
            m.score2 = -int256(STAKE);                        // payout2 = 0
            betrays[m.p2]++;
        } else if (!ok1 && ok2) {                             // p2 honest, p1 no-show
            m.score2 = m.score2 + (int256(STAKE) + m.score1);
            m.score1 = -int256(STAKE);
            betrays[m.p1]++;
        } else {                                              // both forfeit (C3/C5)
            int256 remaining = 2 * int256(STAKE) + m.score1 + m.score2; // 2*STAKE - J
            require(remaining >= 0, "neg jackpot");            // future-proof: revert, never wrap
            jackpot += uint256(remaining);
            m.score1 = -int256(STAKE);
            m.score2 = -int256(STAKE);
            betrays[m.p1]++;
            betrays[m.p2]++;
        }
        m.phase = Phase.Ended;
        emit GameEnded(id, m.score1, m.score2, false);
    }

    // ---- payout ----

    /// @notice Pull your payout once the match is Ended: `STAKE + score` (guaranteed >= 0).
    /// @dev Pull-payment + CEI (`claimed` set before transfer) + nonReentrant. (spec §9 C16/C20)
    function claim(uint256 id) external nonReentrant {
        Match storage m = matches[id];
        require(m.phase == Phase.Ended, "not ended");
        bool isP1 = msg.sender == m.p1;
        require(isP1 || msg.sender == m.p2, "not player");
        require(isP1 ? !m.claimed1 : !m.claimed2, "claimed");
        int256 s = isP1 ? m.score1 : m.score2;
        require(int256(STAKE) + s >= 0, "underflow");          // defensive floor (invariant holds by design)
        uint256 amt = uint256(int256(STAKE) + s);
        if (isP1) { m.claimed1 = true; } else { m.claimed2 = true; }
        emit Claimed(id, msg.sender, amt);
        token.safeTransfer(msg.sender, amt);
    }

    /// @notice Reputation score 0..100 (coops / total). Defaults to 100 for a player with no history.
    function trustScore(address p) external view returns (uint256) {
        uint256 total = uint256(coops[p]) + uint256(betrays[p]);
        return total == 0 ? 100 : (uint256(coops[p]) * 100) / total;
    }
}
