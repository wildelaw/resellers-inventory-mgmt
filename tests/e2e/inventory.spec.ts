import { test, expect } from '@playwright/test';

// Assumes an authenticated admin session has been established via the setup flow.
// Run after auth.spec has created the admin against the same e2e DB.
test.describe('inventory CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type=email]', 'admin@example.com');
    await page.fill('input[type=password]', 'AdminP@ss1');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/\/$/);
  });

  test('create, view, edit, and delete an item', async ({ page }) => {
    await page.goto('/inventory/new');
    await page.fill('input[name="Name"]', 'E2E Jacket');
    await page.fill('input[type=date]', '2024-01-15');
    await page.fill('input[type=number]', '25');
    await page.click('button:has-text("Save")');
    await expect(page).toHaveURL(/\/inventory\/\d+$/);
    await expect(page.locator('h1')).toContainText('E2E Jacket');

    // Edit
    await page.click('text=Edit');
    await page.fill('input[name="Name"]', 'E2E Jacket Updated');
    await page.click('button:has-text("Save")');
    await expect(page.locator('h1')).toContainText('Updated');

    // Delete
    await page.click('button:has-text("Delete item")');
    await page.click('button:has-text("Delete")');
    await expect(page).toHaveURL(/\/inventory$/);
  });
});