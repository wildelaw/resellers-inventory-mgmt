import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests run against a dev server at http://localhost:3000.
 * Start it first: npm run dev  (or docker compose up), then: npm run test:e2e
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});