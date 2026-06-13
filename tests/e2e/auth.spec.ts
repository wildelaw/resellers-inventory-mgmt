import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1, h2, h3')).toContainText(/sign in/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'WrongP@ss1');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 });
  });

  test('redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('can login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@resalemanager.com');
    await page.fill('input[type="password"]', 'AdminP@ss1');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });
});