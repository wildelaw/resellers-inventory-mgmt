import { test, expect, request } from '@playwright/test';

// E2E assumes a fresh DB (needsSetup=true) when the suite starts.
test.describe('auth flow', () => {
  test('setup creates admin, then login works and logout redirects', async ({ page }) => {
    // Reset to a clean setup state via the admin setup-unlock + clearing is out of scope;
    // these specs assume a freshly seeded DB (see playwright.config DATABASE_PATH).
    const status = await (await request.newContext()).get('/api/setup');
    const body = await status.json();
    test.skip(body.hasUsers === true, 'DB already has users; run against a fresh e2e DB');

    await page.goto('/');
    await expect(page).toHaveURL(/\/setup$/);

    // Create admin via the setup page
    await page.click('text=Create new database');
    await page.fill('input[type=email]', 'admin@example.com');
    await page.fill('input[name="Name"]', 'Admin');
    await page.fill('input[type=password]', 'AdminP@ss1');
    await page.click('button:has-text("Create admin")');
    await expect(page).toHaveURL(/\/login$/);

    // Login
    await page.fill('input[type=email]', 'admin@example.com');
    await page.fill('input[type=password]', 'AdminP@ss1');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/\/$/);

    // Logout
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL(/\/login$/);
  });
});