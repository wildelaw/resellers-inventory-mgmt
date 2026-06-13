import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup/env.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**'],
    pool: 'forks',
    singleFork: true,
    globalSetup: ['tests/setup/global-teardown.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});