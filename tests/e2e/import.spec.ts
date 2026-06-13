import { test, expect } from '@playwright/test';

test.describe('CSV Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@resalemanager.com');
    await page.fill('input[type="password"]', 'AdminP@ss1');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('can access import page', async ({ page }) => {
    await page.goto('/imports');
    await expect(page.locator('text=Import')).toBeVisible();
  });

  test('shows import type selector', async ({ page }) => {
    await page.goto('/imports');
    await expect(page.locator('select, [data-testid="import-type"]')).toBeVisible();
  });
});