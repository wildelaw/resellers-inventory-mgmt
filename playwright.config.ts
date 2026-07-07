import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices.chromium } }],
  webServer: { command: 'npm run dev', port: 3000, timeout: 60000, reuseExistingServer: true },
});
