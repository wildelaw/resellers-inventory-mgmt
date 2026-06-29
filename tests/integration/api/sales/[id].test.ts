import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('@/lib/auth', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth')>();
  const { currentSession } = await import('../../../helpers/auth-mock');
  return { ...real, auth: async () => currentSession() };
});

import { createTestDb, cleanupTestDb } from '../../../setup/db';
import { seedUser, seedItem, seedSale, getSale, getItem } from '../../../helpers/seed-data';
import { setSession, makeSession, clearSession } from '../../../helpers/auth-mock';
import { invoke } from '../../../helpers/api';
import * as saleIdRoute from '@/app/api/sales/[id]/route';

let dbPath: string;
let userId: number;
let adminId: number;

beforeAll(async () => {
  dbPath = createTestDb();
  adminId = (await seedUser({ email: 'admin@example.com', role: 'admin' })).id;
  userId = (await seedUser({ email: 'user@example.com', role: 'user' })).id;
});
afterAll(() => { cleanupTestDb(dbPath); clearSession(); });
beforeEach(() => setSession(makeSession({ id: String(userId), role: 'user', canViewAll: false })));

describe('GET /api/sales/:id (integration)', () => {
  it('owner can get own sale', async () => {
    const id = seedSale({ soldBy: userId, soldPrice: 25 });
    const res = await invoke(saleIdRoute.GET, `/api/sales/${id}`, { method: 'GET', params: { id: String(id) } });
    expect(res.status).toBe(200);
  });
  it('regular user cannot get others sale (403)', async () => {
    const id = seedSale({ soldBy: adminId, soldPrice: 25 });
    const res = await invoke(saleIdRoute.GET, `/api/sales/${id}`, { method: 'GET', params: { id: String(id) } });
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/sales/:id (integration)', () => {
  it('owner can update own sale', async () => {
    const id = seedSale({ soldBy: userId, soldPrice: 25 });
    const res = await invoke(saleIdRoute.PUT, `/api/sales/${id}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(id) }, body: { soldPrice: '30' },
    });
    expect(res.status).toBe(200);
    expect(Number(getSale(id)?.soldPrice)).toBe(30);
  });
  it('rejects update without Origin (403)', async () => {
    const id = seedSale({ soldBy: userId, soldPrice: 25 });
    const res = await invoke(saleIdRoute.PUT, `/api/sales/${id}`, {
      method: 'PUT', params: { id: String(id) }, body: { soldPrice: '30' },
    });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/sales/:id (integration)', () => {
  it('deletes sale and reverts item to available', async () => {
    const itemId = seedItem({ ownerId: userId, status: 'sold' });
    const id = seedSale({ soldBy: userId, itemId, soldPrice: 25 });
    const res = await invoke(saleIdRoute.DELETE, `/api/sales/${id}`, {
      method: 'DELETE', origin: 'http://localhost:3000', params: { id: String(id) },
    });
    expect(res.status).toBe(200);
    expect(getItem(itemId)?.status).toBe('available');
    expect(getSale(id)).toBeUndefined();
  });
  it('regular user cannot delete others sale (403)', async () => {
    const id = seedSale({ soldBy: adminId, soldPrice: 25 });
    const res = await invoke(saleIdRoute.DELETE, `/api/sales/${id}`, {
      method: 'DELETE', origin: 'http://localhost:3000', params: { id: String(id) },
    });
    expect(res.status).toBe(403);
  });
});