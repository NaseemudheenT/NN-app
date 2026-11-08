import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    // Rules tests share one emulator instance, so they must not race.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
