import { test, expect } from '@playwright/test';

test('sales page requires auth', async ({ page }) => {
  await page.goto('/sales');
  await expect(page).toHaveURL(/\/login/);
});
