import { test, expect } from '@playwright/test';

test.describe('sale creation and refund', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type=email]', 'admin@example.com');
    await page.fill('input[type=password]', 'AdminP@ss1');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/\/$/);
  });

  test('record a sale and process a refund', async ({ page }) => {
    // First create an item to sell
    await page.goto('/inventory/new');
    await page.fill('input[name="Name"]', 'E2E Sale Item');
    await page.fill('input[type=date]', '2024-01-10');
    await page.fill('input[type=number]', '20');
    await page.click('button:has-text("Save")');
    await expect(page).toHaveURL(/\/inventory\/\d+$/);

    // Record a sale
    await page.goto('/sales/new');
    await page.click('button:has-text("Open sale form")');
    // select the item we just created (last in the list)
    await page.locator('select#itemId').selectOption({ index: 1 });
    await page.fill('input#soldPrice', '40');
    await page.click('button:has-text("Save")');
    await expect(page).toHaveURL(/\/sales$/);

    // Open the first sale and process a refund
    await page.goto('/sales');
    await page.locator('a:has-text("2024")').first().click();
    await page.click('button:has-text("Process refund")');
    await page.fill('input#refundAmount', '10');
    await page.click('button:has-text("Process refund")');
    await expect(page.locator('text=Refund')).toBeVisible();
  });
});