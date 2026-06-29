import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('@/lib/auth', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth')>();
  const { currentSession } = await import('../../helpers/auth-mock');
  return { ...real, auth: async () => currentSession() };
});

import { createTestDb, cleanupTestDb } from '../../setup/db';
import { seedUser, seedItem, seedSale } from '../../helpers/seed-data';
import { setSession, makeSession, clearSession } from '../../helpers/auth-mock';
import { invoke } from '../../helpers/api';
import * as inventoryRoute from '@/app/api/inventory/route';
import * as inventoryIdRoute from '@/app/api/inventory/[id]/route';
import * as adminUsersRoute from '@/app/api/admin/users/route';
import * as settingsRoute from '@/app/api/settings/route';

let dbPath: string;
let adminId: number;
let userId: number;
let canViewAllId: number;

beforeAll(async () => {
  dbPath = createTestDb();
  adminId = (await seedUser({ email: 'admin@example.com', role: 'admin' })).id;
  userId = (await seedUser({ email: 'user@example.com', role: 'user', canViewAll: false })).id;
  canViewAllId = (await seedUser({ email: 'viewer@example.com', role: 'user', canViewAll: true })).id;
});
afterAll(() => { cleanupTestDb(dbPath); clearSession(); });

describe('RBAC across role combinations (integration)', () => {
  it('REG-09: standard user cannot access another user items', async () => {
    const othersItem = seedItem({ ownerId: adminId });
    setSession(makeSession({ id: String(userId), role: 'user', canViewAll: false }));
    const get = await invoke(inventoryIdRoute.GET, `/api/inventory/${othersItem}`, { method: 'GET', params: { id: String(othersItem) } });
    expect(get.status).toBe(403);
  });

  it('REG-10: canViewAll user can view all but only edit own', async () => {
    const othersItem = seedItem({ ownerId: adminId });
    setSession(makeSession({ id: String(canViewAllId), role: 'user', canViewAll: true }));
    const get = await invoke(inventoryIdRoute.GET, `/api/inventory/${othersItem}`, { method: 'GET', params: { id: String(othersItem) } });
    expect(get.status).toBe(200);
    const put = await invoke(inventoryIdRoute.PUT, `/api/inventory/${othersItem}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(othersItem) }, body: { name: 'X' },
    });
    expect(put.status).toBe(403);
  });

  it('REG-11: admin can edit any data', async () => {
    const othersItem = seedItem({ ownerId: userId });
    setSession(makeSession({ id: String(adminId), role: 'admin', canViewAll: true }));
    const put = await invoke(inventoryIdRoute.PUT, `/api/inventory/${othersItem}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(othersItem) }, body: { name: 'Admin Edit' },
    });
    expect(put.status).toBe(200);
  });

  it('admin can manage users; non-admin cannot (403)', async () => {
    setSession(makeSession({ id: String(adminId), role: 'admin', canViewAll: true }));
    const adminList = await invoke(adminUsersRoute.GET, '/api/admin/users', { method: 'GET' });
    expect(adminList.status).toBe(200);

    setSession(makeSession({ id: String(userId), role: 'user', canViewAll: false }));
    const userList = await invoke(adminUsersRoute.GET, '/api/admin/users', { method: 'GET' });
    expect(userList.status).toBe(403);
  });

  it('canViewAll user cannot manage users (403)', async () => {
    setSession(makeSession({ id: String(canViewAllId), role: 'user', canViewAll: true }));
    const list = await invoke(adminUsersRoute.GET, '/api/admin/users', { method: 'GET' });
    expect(list.status).toBe(403);
  });

  it('settings PUT is admin-only (403 for user)', async () => {
    setSession(makeSession({ id: String(userId), role: 'user' }));
    const res = await invoke(settingsRoute.PUT, '/api/settings', {
      method: 'PUT', origin: 'http://localhost:3000', body: { companyName: 'X' },
    });
    expect(res.status).toBe(403);
  });

  it('settings GET is available to any authenticated user', async () => {
    setSession(makeSession({ id: String(userId), role: 'user' }));
    const res = await invoke(settingsRoute.GET, '/api/settings', { method: 'GET' });
    expect(res.status).toBe(200);
  });
});