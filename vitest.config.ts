import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup/env.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    pool: "forks",
    testTimeout: 30000,
    hookTimeout: 30000,
    // @ts-expect-error - singleFork is supported in Vitest 4 runtime
    singleFork: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
