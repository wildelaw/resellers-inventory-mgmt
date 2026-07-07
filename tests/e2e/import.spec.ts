import { test, expect } from '@playwright/test';

test('import page requires auth', async ({ page }) => {
  await page.goto('/imports');
  await expect(page).toHaveURL(/\/login/);
});
