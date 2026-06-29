import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup/env.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx', 'tests/functional/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    pool: 'forks',
    fileParallelism: false,
    globalSetup: ['tests/setup/global-teardown.ts'],
    server: {
      deps: {
        // next-auth imports `next/server` without an extension; inline it so
        // Vite's resolver (which honors the package exports map) handles it.
        inline: ['next-auth', '@auth/core'],
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});