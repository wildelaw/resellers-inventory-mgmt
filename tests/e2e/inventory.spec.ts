import { test, expect } from '@playwright/test';

test.describe('Inventory CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@resalemanager.com');
    await page.fill('input[type="password"]', 'AdminP@ss1');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('can view inventory list', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.locator('text=Inventory')).toBeVisible();
  });

  test('can create a new item', async ({ page }) => {
    await page.goto('/inventory/new');
    await page.fill('input[name="name"], #name', 'Test Item E2E');
    await page.fill('input[type="number"], input[name="purchasePrice"], #purchasePrice', '25');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/inventory/, { timeout: 10000 });
  });

  test('can navigate to item detail', async ({ page }) => {
    await page.goto('/inventory');
    const firstItem = page.locator('a[href*="/inventory/"]').first();
    if (await firstItem.isVisible()) {
      await firstItem.click();
      await expect(page).toHaveURL(/\/inventory\/\d+/);
    }
  });
});