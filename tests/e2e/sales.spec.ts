import { test, expect } from '@playwright/test';

test.describe('Sales', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@resalemanager.com');
    await page.fill('input[type="password"]', 'AdminP@ss1');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('can view sales list', async ({ page }) => {
    await page.goto('/sales');
    await expect(page.locator('text=Sales')).toBeVisible();
  });

  test('can navigate to record sale page', async ({ page }) => {
    await page.goto('/sales/new');
    await expect(page.locator('text=Sale')).toBeVisible();
  });
});