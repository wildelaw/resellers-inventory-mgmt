import { test, expect } from '@playwright/test';
import { login, logout, ADMIN_EMAIL } from './helpers';

test.describe('auth', () => {
  test('redirects unauthenticated visitors to the login page', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs in with valid credentials and lands on the dashboard', async ({ page }) => {
    await login(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('header')).toContainText(new RegExp(ADMIN_EMAIL.split('@')[0]));
  });

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', 'wrong-password');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('logs out and returns to the login page', async ({ page }) => {
    await login(page);
    await logout(page);
    await expect(page).toHaveURL(/\/login/);

    // The session cookie must actually be gone
    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/login/);
  });
});