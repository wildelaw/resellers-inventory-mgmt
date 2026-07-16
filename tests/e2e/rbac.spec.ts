import { test, expect } from "@playwright/test";

test("admin can navigate to user management", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "admin@example.com");
  await page.fill('input[type="password"]', "AdminP@ss123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/", { timeout: 15000 });

  await page.goto("/admin/users");
  await expect(page.locator("h1")).toContainText("User Management");
});
