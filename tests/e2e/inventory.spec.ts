import { test, expect } from '@playwright/test';

test('inventory page requires auth', async ({ page }) => {
  await page.goto('/inventory');
  await expect(page).toHaveURL(/\/login/);
});
