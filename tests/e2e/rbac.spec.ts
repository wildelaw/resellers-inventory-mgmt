import { test, expect } from '@playwright/test';

test('admin page requires auth', async ({ page }) => {
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/login/);
});
