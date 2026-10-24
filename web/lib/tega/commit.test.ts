import { describe, expect, it } from "vitest";
import { buildCommitHash } from "./commit";
import { Choice } from "./types";

describe("buildCommitHash — parity with Tega.sol:193", () => {
  it("matches a cast-generated fixture", () => {
    // Fixture from: cast abi-encode --packed "f(uint8,bytes32,uint256,uint8,address)"
    //   1 0x11..11 1 1 0x1234..7890 | cast keccak
    const hash = buildCommitHash(
      Choice.Bagi,
      `0x${"11".repeat(32)}`,
      1n,
      1,
      "0x1234567890123456789012345678901234567890",
    );
    expect(hash).toBe("0x7113a1c9fa84436b281e868632020a2f179feca9f9949382b34564cc73a50896");
  });

  it("changes when any field changes (field binding)", () => {
    const base = buildCommitHash(Choice.Bagi, `0x${"11".repeat(32)}`, 1n, 1, "0x1234567890123456789012345678901234567890");
    const diffRound = buildCommitHash(Choice.Bagi, `0x${"11".repeat(32)}`, 1n, 2, "0x1234567890123456789012345678901234567890");
    const diffId = buildCommitHash(Choice.Bagi, `0x${"11".repeat(32)}`, 2n, 1, "0x1234567890123456789012345678901234567890");
    const diffChoice = buildCommitHash(Choice.Steal, `0x${"11".repeat(32)}`, 1n, 1, "0x1234567890123456789012345678901234567890");
    expect(new Set([base, diffRound, diffId, diffChoice]).size).toBe(4);
  });

  it("is address-case insensitive (packed raw bytes)", () => {
    const lower = buildCommitHash(Choice.Bagi, `0x${"11".repeat(32)}`, 1n, 1, "0x1234567890123456789012345678901234567890");
    const checksummed = buildCommitHash(Choice.Bagi, `0x${"11".repeat(32)}`, 1n, 1, "0x1234567890123456789012345678901234567890".toUpperCase().replace("0X", "0x") as `0x${string}`);
    expect(lower).toBe(checksummed);
  });
});
