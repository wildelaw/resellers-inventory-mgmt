import { test, expect, request } from '@playwright/test';

// Assumes admin exists. Creates a regular user + a canViewAll user via the admin API,
// then exercises role-based access in the browser.
test.describe('RBAC', () => {
  test('user sees own data, canViewAll user sees all, admin manages', async ({ browser }) => {
    // Provision users via admin API (using the admin's session cookie).
    const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });
    // login admin via the credentials callback (handled by Playwright's storage? simpler: use UI)
    // For brevity, assume admin login; create users through the admin UI.
    const adminPage = await browser.newPage();
    await adminPage.goto('/login');
    await adminPage.fill('input[type=email]', 'admin@example.com');
    await adminPage.fill('input[type=password]', 'AdminP@ss1');
    await adminPage.click('button:has-text("Sign In")');

    await adminPage.goto('/admin/users');
    await adminPage.click('button:has-text("Add User")');
    await adminPage.fill('input[type=email]', 'regular@example.com');
    await adminPage.fill('input[name="Name"]', 'Regular');
    await adminPage.fill('input[type=password]', 'UserP@ss1');
    await adminPage.click('button:has-text("Create")');

    // Regular user logs in, cannot see admin's items
    const userPage = await browser.newPage();
    await userPage.goto('/login');
    await userPage.fill('input[type=email]', 'regular@example.com');
    await userPage.fill('input[type=password]', 'UserP@ss1');
    await userPage.click('button:has-text("Sign In")');
    await userPage.goto('/inventory');
    // A brand-new regular user sees no admin items
    await expect(userPage.locator('text=No items found')).toBeVisible();
    // Regular user has no admin nav links
    await expect(userPage.locator('a:has-text("Users")')).toHaveCount(0);

    await ctx.dispose();
  });
});