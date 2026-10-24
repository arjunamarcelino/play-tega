import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // commit.ts is pure (viem + crypto); no DOM needed.
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
