import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('@/lib/auth', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth')>();
  const { currentSession } = await import('../../../../helpers/auth-mock');
  return { ...real, auth: async () => currentSession() };
});

import { createTestDb, cleanupTestDb } from '../../../../setup/db';
import { seedUser, seedItem, getItem } from '../../../../helpers/seed-data';
import { setSession, makeSession, clearSession } from '../../../../helpers/auth-mock';
import { invoke } from '../../../../helpers/api';
import * as bulkRoute from '@/app/api/inventory/bulk/route';

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

describe('PATCH /api/inventory/bulk (integration)', () => {
  it('updates status for multiple owned items and sets removalDate for donated', async () => {
    const a = seedItem({ ownerId: userId, status: 'available' });
    const b = seedItem({ ownerId: userId, status: 'listed' });
    const res = await invoke(bulkRoute.PATCH, '/api/inventory/bulk', {
      method: 'PATCH', origin: 'http://localhost:3000', body: { ids: [a, b], status: 'donated' },
    });
    expect(res.status).toBe(200);
    expect(getItem(a)?.status).toBe('donated');
    expect(getItem(b)?.removalDate).not.toBeNull();
  });

  it('rejects bulk status change for items not owned by a regular user (403)', async () => {
    const mine = seedItem({ ownerId: userId, status: 'available' });
    const theirs = seedItem({ ownerId: adminId, status: 'available' });
    const res = await invoke(bulkRoute.PATCH, '/api/inventory/bulk', {
      method: 'PATCH', origin: 'http://localhost:3000', body: { ids: [mine, theirs], status: 'sold' },
    });
    expect(res.status).toBe(403);
  });

  it('admin can bulk-update any items', async () => {
    setSession(makeSession({ id: String(adminId), role: 'admin', canViewAll: true }));
    const a = seedItem({ ownerId: userId, status: 'available' });
    const res = await invoke(bulkRoute.PATCH, '/api/inventory/bulk', {
      method: 'PATCH', origin: 'http://localhost:3000', body: { ids: [a], status: 'listed' },
    });
    expect(res.status).toBe(200);
    expect(getItem(a)?.status).toBe('listed');
  });

  it('rejects without Origin (403)', async () => {
    const a = seedItem({ ownerId: userId, status: 'available' });
    const res = await invoke(bulkRoute.PATCH, '/api/inventory/bulk', {
      method: 'PATCH', body: { ids: [a], status: 'sold' },
    });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/inventory/bulk (integration)', () => {
  it('deletes multiple owned items', async () => {
    const a = seedItem({ ownerId: userId });
    const b = seedItem({ ownerId: userId });
    const res = await invoke(bulkRoute.DELETE, `/api/inventory/bulk?ids=${a},${b}`, {
      method: 'DELETE', origin: 'http://localhost:3000',
    });
    expect(res.status).toBe(200);
    expect(getItem(a)).toBeUndefined();
    expect(getItem(b)).toBeUndefined();
  });

  it('rejects bulk delete of others items by a regular user (403)', async () => {
    const theirs = seedItem({ ownerId: adminId });
    const res = await invoke(bulkRoute.DELETE, `/api/inventory/bulk?ids=${theirs}`, {
      method: 'DELETE', origin: 'http://localhost:3000',
    });
    expect(res.status).toBe(403);
  });
});