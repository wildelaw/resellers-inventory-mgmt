import { test, expect } from '@playwright/test';

test.describe('CSV import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type=email]', 'admin@example.com');
    await page.fill('input[type=password]', 'AdminP@ss1');
    await page.click('button:has-text("Sign In")');
  });

  test('import inventory CSV', async ({ page }) => {
    await page.goto('/imports');
    await page.click('text=Inventory');
    await page.locator('textarea').fill('name,purchase_date,purchase_price\nE2E Import Hat,2024-05-01,15\nE2E Import Shirt,2024-05-02,8');
    await page.click('button:has-text("Import")');
    await expect(page.locator('text=Imported 2 row')).toBeVisible();

    await page.goto('/inventory');
    await expect(page.locator('text=E2E Import Hat')).toBeVisible();
  });

  test('import mileage CSV', async ({ page }) => {
    await page.goto('/imports');
    await page.click('text=Mileage');
    await page.locator('textarea').fill('date,miles\n2024-05-01,5\n2024-05-02,12');
    await page.click('button:has-text("Import")');
    await expect(page.locator('text=Imported 2 row')).toBeVisible();
  });
});