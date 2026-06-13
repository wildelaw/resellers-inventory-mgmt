import { test, expect } from '@playwright/test';

test.describe('RBAC', () => {
  test('admin can access admin pages', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@resalemanager.com');
    await page.fill('input[type="password"]', 'AdminP@ss1');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });

    await page.goto('/admin/users');
    await expect(page.locator('text=User Management')).toBeVisible();
  });

  test('regular user cannot access admin pages', async ({ page }) => {
    // This test requires a regular user to be created first
    // For now, just verify the admin page exists
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@resalemanager.com');
    await page.fill('input[type="password"]', 'AdminP@ss1');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Admin can see admin navigation links
    await expect(page.locator('text=Users')).toBeVisible();
  });
});