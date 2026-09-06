import { Page } from '@playwright/test';

/**
 * Shared E2E helpers. Tests assume a dev server running at http://localhost:3000
 * (npm run dev, or docker compose up) with setup completed. The seeded admin
 * (npm run seed) is used for authenticated flows.
 */

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'security@lawsonsoft.com';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin123!@#';

export async function login(page: Page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'));
}

export async function logout(page: Page) {
  // The header exposes a sign-out control
  await page.click('header button:has-text("Sign Out")');
  await page.waitForURL((url) => url.pathname.includes('/login'));
}

export async function createItemViaApi(page: Page, item: {
  name: string; purchasePrice: string | number; purchaseDate: string;
}) {
  const res = await page.request.post('/api/inventory', { data: item });
  if (res.status() !== 201) {
    throw new Error(`Failed to create item via API: ${res.status()} — ${await res.text()}`);
  }
  return (await res.json()) as { id: number };
}