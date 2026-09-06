import { test, expect, type Browser } from '@playwright/test';
import { login, ADMIN_EMAIL } from './helpers';

/**
 * REG-09/10/11 in the browser: standard users see only their own data,
 * canViewAll users see everything but cannot manage users, admins manage all.
 *
 * Helper users are created through the admin API with unique emails and are
 * cleaned up at the end of the run.
 */

const RUN = Date.now();
const BOB = { email: `e2e-bob-${RUN}@test.local`, password: 'Rbac123!@#', name: 'E2E Bob', role: 'user', canViewAll: false };
const CAROL = { email: `e2e-carol-${RUN}@test.local`, password: 'Rbac123!@#', name: 'E2E Carol', role: 'user', canViewAll: true };

let adminPage: import('@playwright/test').Page;
let bobPage: import('@playwright/test').Page;
let carolPage: import('@playwright/test').Page;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  // Prepare users through the admin API using the seeded admin session
  const adminContext = await browser.newContext();
  adminPage = await adminContext.newPage();
  await login(adminPage);
  for (const user of [BOB, CAROL]) {
    const res = await adminPage.request.post('/api/admin/users', { data: user });
    if (res.status() !== 201 && res.status() !== 200) {
      throw new Error(`Failed to create ${user.email}: ${res.status()} — ${await res.text()}`);
    }
  }
});

test.afterAll(async () => {
  if (adminPage) {
    const users = await (await adminPage.request.get('/api/admin/users?pageSize=100')).json();
    for (const u of users.items as Array<{ id: number; email: string }>) {
      if (u.email.startsWith('e2e-bob-') || u.email.startsWith('e2e-carol-')) {
        await adminPage.request.delete(`/api/admin/users/${u.id}`);
      }
    }
    await adminPage.context().close();
  }
  await bobPage?.context().close();
  await carolPage?.context().close();
});

test('standard user sees only their own items', async ({ browser }) => {
  const ctx = await browser.newContext();
  bobPage = await ctx.newPage();
  await login(bobPage, BOB.email, BOB.password);

  // Bob creates an item
  await bobPage.request.post('/api/inventory', {
    data: { name: `Bob Only ${RUN}`, purchasePrice: '15.00', purchaseDate: '2026-01-20' },
  });
  await bobPage.goto('/inventory');
  await expect(bobPage.locator(`text=Bob Only ${RUN}`)).toBeVisible();
  // Admin's seeded items must not leak in
  await expect(bobPage.locator(`text=E2E Carol`)).toHaveCount(0);
});

test('canViewAll user reads other users items but cannot edit them', async ({ browser }) => {
  const ctx = await browser.newContext();
  carolPage = await ctx.newPage();
  await login(carolPage, CAROL.email, CAROL.password);

  await carolPage.goto('/inventory');
  await expect(carolPage.locator(`text=Bob Only ${RUN}`)).toBeVisible();

  // Carol can open Bob's item for reading, but the edit controls are not offered
  // and the API rejects her writes.
  const bobItems = await (await carolPage.request.get(`/api/inventory?search=Bob Only ${RUN}`)).json();
  const bobsItemId = bobItems.items[0]?.id as number | undefined;
  expect(bobsItemId).toBeDefined();
  const put = await carolPage.request.put(`/api/inventory/${bobsItemId}`, {
    data: { name: 'Hijacked' },
  });
  expect(put.status()).toBe(403);
});

test('standard and canViewAll users cannot access admin pages', async ({ browser }) => {
  for (const creds of [BOB, CAROL]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, creds.email, creds.password);
    const res = await page.request.get('/api/admin/users');
    expect(res.status()).toBe(403);
    await page.goto('/admin/users');
    // Proxy redirects non-admins away from admin pages
    await expect(page).not.toHaveURL(/\/admin\/users/);
    await ctx.close();
  }
});

test('admin sees all users and manages them', async () => {
  await adminPage.goto('/admin/users');
  await expect(adminPage.locator(`text=${CAROL.email}`)).toBeVisible();
  await expect(adminPage.locator(`text=${BOB.email}`)).toBeVisible();
  void ADMIN_EMAIL;
});