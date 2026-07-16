import { test, expect } from "@playwright/test";

test.describe("Auth flow", () => {
  test("redirects unauthenticated users to /login", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page).toHaveURL(/\/login/);
  });

  test("can sign in with valid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@example.com");
    await page.fill('input[type="password"]', "AdminP@ss123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });
  });

  test("shows error on bad credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "wrong@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Invalid email or password")).toBeVisible({ timeout: 10000 });
  });
});
