import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('@/lib/auth', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth')>();
  const { currentSession } = await import('../../../helpers/auth-mock');
  return { ...real, auth: async () => currentSession() };
});

import { createTestDb, cleanupTestDb } from '../../../setup/db';
import { seedUser, seedItem } from '../../../helpers/seed-data';
import { setSession, makeSession, clearSession } from '../../../helpers/auth-mock';
import { invoke } from '../../../helpers/api';
import * as inventoryIdRoute from '@/app/api/inventory/[id]/route';

let dbPath: string;
let adminId: number;
let userId: number;
let otherItemId: number;
let ownItemId: number;

beforeAll(async () => {
  dbPath = createTestDb();
  adminId = (await seedUser({ email: 'admin@example.com', role: 'admin' })).id;
  userId = (await seedUser({ email: 'user@example.com', role: 'user', canViewAll: false })).id;
  otherItemId = seedItem({ ownerId: adminId, name: 'Admin Item' });
  ownItemId = seedItem({ ownerId: userId, name: 'User Item' });
});
afterAll(() => { cleanupTestDb(dbPath); clearSession(); });
beforeEach(() => setSession(makeSession({ id: String(userId), role: 'user', canViewAll: false })));

describe('GET /api/inventory/:id (integration)', () => {
  it('owner can get own item', async () => {
    const res = await invoke(inventoryIdRoute.GET, `/api/inventory/${ownItemId}`, { method: 'GET', params: { id: String(ownItemId) } });
    expect(res.status).toBe(200);
    expect((res.body as { name: string }).name).toBe('User Item');
  });
  it('regular user cannot get others item (403)', async () => {
    const res = await invoke(inventoryIdRoute.GET, `/api/inventory/${otherItemId}`, { method: 'GET', params: { id: String(otherItemId) } });
    expect(res.status).toBe(403);
  });
  it('canViewAll user can get others item', async () => {
    setSession(makeSession({ id: String(userId), role: 'user', canViewAll: true }));
    const res = await invoke(inventoryIdRoute.GET, `/api/inventory/${otherItemId}`, { method: 'GET', params: { id: String(otherItemId) } });
    expect(res.status).toBe(200);
  });
  it('404 for missing item', async () => {
    const res = await invoke(inventoryIdRoute.GET, '/api/inventory/999999', { method: 'GET', params: { id: '999999' } });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/inventory/:id (integration)', () => {
  it('owner can update own item', async () => {
    const res = await invoke(inventoryIdRoute.PUT, `/api/inventory/${ownItemId}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(ownItemId) }, body: { name: 'Renamed' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { name: string }).name).toBe('Renamed');
  });
  it('regular user cannot update others item (403)', async () => {
    const res = await invoke(inventoryIdRoute.PUT, `/api/inventory/${otherItemId}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(otherItemId) }, body: { name: 'Hacked' },
    });
    expect(res.status).toBe(403);
  });
  it('admin can update others item', async () => {
    setSession(makeSession({ id: String(adminId), role: 'admin', canViewAll: true }));
    const res = await invoke(inventoryIdRoute.PUT, `/api/inventory/${ownItemId}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(ownItemId) }, body: { name: 'Admin Renamed' },
    });
    expect(res.status).toBe(200);
  });
  it('rejects update without Origin (403)', async () => {
    const res = await invoke(inventoryIdRoute.PUT, `/api/inventory/${ownItemId}`, {
      method: 'PUT', params: { id: String(ownItemId) }, body: { name: 'NoOrigin' },
    });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/inventory/:id (integration)', () => {
  it('owner can delete own item', async () => {
    const id = seedItem({ ownerId: userId, name: 'ToDelete' });
    const res = await invoke(inventoryIdRoute.DELETE, `/api/inventory/${id}`, {
      method: 'DELETE', origin: 'http://localhost:3000', params: { id: String(id) },
    });
    expect(res.status).toBe(200);
  });
  it('regular user cannot delete others item (403)', async () => {
    const res = await invoke(inventoryIdRoute.DELETE, `/api/inventory/${otherItemId}`, {
      method: 'DELETE', origin: 'http://localhost:3000', params: { id: String(otherItemId) },
    });
    expect(res.status).toBe(403);
  });
});