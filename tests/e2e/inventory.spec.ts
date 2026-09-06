import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL } from './helpers';

const NAME = `E2E Inventory ${Date.now()}`;

test.describe('inventory CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('creates, views, edits, and deletes an item', async ({ page }) => {
    // Create
    await page.goto('/inventory/new');
    await page.fill('#item-name', NAME);
    await page.fill('#item-purchase-price', '42.50');
    await page.fill('#item-purchase-date', '2026-01-15');
    await page.fill('#item-category', 'Electronics');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/inventory\/\d+$/);

    // View — detail page shows the entered values
    await expect(page.locator('h1')).toContainText(NAME);

    // Edit
    await page.goto(`/inventory/${page.url().match(/\/inventory\/(\d+)/)![1]}/edit`);
    await page.fill('#item-name', `${NAME} (edited)`);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/inventory\/\d+$/);
    await expect(page.locator('h1')).toContainText(`${NAME} (edited)`);

    // Delete
    page.once('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("Delete")');
    await page.waitForURL(/\/inventory$/);
    await expect(page.locator(`text=${NAME} (edited)`)).toHaveCount(0);
  });

  test('shows validation errors for an incomplete form', async ({ page }) => {
    await page.goto('/inventory/new');
    await page.click('button[type="submit"]');
    // HTML5 validation keeps us on the form
    await expect(page).toHaveURL(/\/inventory\/new/);
  });

  test('lists items in the inventory table', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.locator('table, [role="table"]')).toBeVisible();
    // The seeded admin has at least one item (created by this or prior runs)
    await expect(page.locator('body')).not.toContainText(ADMIN_EMAIL); // no email leakage
  });
});