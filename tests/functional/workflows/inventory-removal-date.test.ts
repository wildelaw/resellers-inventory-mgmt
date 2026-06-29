import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('@/lib/auth', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth')>();
  const { currentSession } = await import('../../helpers/auth-mock');
  return { ...real, auth: async () => currentSession() };
});

import { createTestDb, cleanupTestDb } from '../../setup/db';
import { seedUser, seedItem, getItem } from '../../helpers/seed-data';
import { setSession, makeSession, clearSession } from '../../helpers/auth-mock';
import { invoke } from '../../helpers/api';
import * as bulkRoute from '@/app/api/inventory/bulk/route';
import * as inventoryIdRoute from '@/app/api/inventory/[id]/route';

let dbPath: string;
let userId: number;

beforeAll(async () => {
  dbPath = createTestDb();
  const u = await seedUser({ email: 'owner@example.com' });
  userId = u.id;
  setSession(makeSession({ id: String(userId), role: 'user', canViewAll: false }));
});
afterAll(() => { cleanupTestDb(dbPath); clearSession(); });

describe('removalDate side effects (functional)', () => {
  it('REG-05: bulk update to donated sets removalDate, no $0 sales created', async () => {
    const a = seedItem({ ownerId: userId, status: 'available' });
    const b = seedItem({ ownerId: userId, status: 'listed' });
    const res = await invoke(bulkRoute.PATCH, '/api/inventory/bulk', {
      method: 'PATCH', origin: 'http://localhost:3000',
      body: { ids: [a, b], status: 'donated' },
    });
    expect(res.status).toBe(200);
    expect(getItem(a)?.removalDate).not.toBeNull();
    expect(getItem(b)?.removalDate).not.toBeNull();
    expect(getItem(a)?.status).toBe('donated');
  });

  it('REG-13: transition to donated sets removalDate', async () => {
    const id = seedItem({ ownerId: userId, status: 'available' });
    await invoke(inventoryIdRoute.PUT, `/api/inventory/${id}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(id) }, body: { status: 'donated' },
    });
    expect(getItem(id)?.removalDate).not.toBeNull();
  });

  it('REG-14: returned -> available clears removalDate', async () => {
    const id = seedItem({ ownerId: userId, status: 'returned' });
    await invoke(inventoryIdRoute.PUT, `/api/inventory/${id}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(id) }, body: { status: 'available' },
    });
    expect(getItem(id)?.status).toBe('available');
    expect(getItem(id)?.removalDate).toBeNull();
  });

  it('bulk update to discarded sets removalDate', async () => {
    const id = seedItem({ ownerId: userId, status: 'available' });
    await invoke(bulkRoute.PATCH, '/api/inventory/bulk', {
      method: 'PATCH', origin: 'http://localhost:3000',
      body: { ids: [id], status: 'discarded' },
    });
    expect(getItem(id)?.status).toBe('discarded');
    expect(getItem(id)?.removalDate).not.toBeNull();
  });
});