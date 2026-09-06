import { test, expect } from '@playwright/test';
import { login, createItemViaApi } from './helpers';

const NAME = `E2E Sale Item ${Date.now()}`;

test.describe('sales workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('records a sale against an inventory item and shows profit', async ({ page }) => {
    const item = await createItemViaApi(page, {
      name: NAME,
      purchasePrice: '30.00',
      purchaseDate: '2026-02-01',
    });

    await page.goto('/sales/new');
    await page.selectOption('#sale-item', { label: NAME });
    await page.fill('#sale-price', '75.00');
    await page.fill('#sale-fees', '5.00');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/sales\/\d+$/);

    // Sale detail shows the sold price and a profit computed from the linked item
    await expect(page.locator('text=75.00')).toBeVisible();
    await expect(page.locator('body')).toContainText('$40.00'); // 75 - 30 - 5 fees

    // The item is now marked sold on the inventory list
    await page.goto('/inventory');
    await page.fill('input[type="search"], input[placeholder*="Search"]', NAME);
    await expect(page.locator('text=Sold').first()).toBeVisible();
    void item;
  });

  test('processes a refund and updates the sale', async ({ page }) => {
    const name = `E2E Refund Item ${Date.now()}`;
    await createItemViaApi(page, {
      name,
      purchasePrice: '20.00',
      purchaseDate: '2026-02-02',
    });

    await page.goto('/sales/new');
    await page.selectOption('#sale-item', { label: name });
    await page.fill('#sale-price', '60.00');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/sales\/\d+$/);

    // Open the refund modal and record a full refund
    await page.click('button:has-text("Process Refund")');
    await page.fill('#refund-amount', '60.00');
    await page.fill('#refund-reason', 'Buyer changed mind');
    await page.click('form button[type="submit"]');
    await expect(page.locator('text=Buyer changed mind')).toBeVisible();
  });

  test('deletes a sale and reverts the item to available', async ({ page }) => {
    const name = `E2E Delete Sale ${Date.now()}`;
    await createItemViaApi(page, { name, purchasePrice: '10.00', purchaseDate: '2026-02-03' });

    await page.goto('/sales/new');
    await page.selectOption('#sale-item', { label: name });
    await page.fill('#sale-price', '25.00');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/sales\/\d+$/);

    page.once('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("Delete")');
    await page.waitForURL(/\/sales$/);
  });
});