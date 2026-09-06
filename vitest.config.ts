import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'forks',
    // Vitest 4: pools are isolated per file by default; no poolOptions needed
    include: [
      'tests/unit/**/*.test.ts',
      'tests/functional/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    testTimeout: 30000,
  },
});