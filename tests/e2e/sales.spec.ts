import { test, expect } from "@playwright/test";

test.describe("Sales page", () => {
  test("sales page loads for authenticated user", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@example.com");
    await page.fill('input[type="password"]', "AdminP@ss123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });

    await page.click('a:has-text("Sales")');
    await expect(page).toHaveURL(/\/sales/);
  });
});
