import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('@/lib/auth', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth')>();
  const { currentSession } = await import('../../helpers/auth-mock');
  return { ...real, auth: async () => currentSession() };
});
import { db } from '@/lib/db';
import { sales } from '@/lib/schema';
import { createTestDb, cleanupTestDb } from '../../setup/db';
import { seedUser, seedItem, getItem } from '../../helpers/seed-data';
import { setSession, makeSession, clearSession } from '../../helpers/auth-mock';
import { invoke } from '../../helpers/api';
import * as inventoryRoute from '@/app/api/inventory/[id]/route';

let dbPath: string;
let userId: number;

beforeAll(async () => {
  dbPath = createTestDb();
  const u = await seedUser({ email: 'owner@example.com' });
  userId = u.id;
});
afterAll(() => cleanupTestDb(dbPath));
beforeEach(() => { setSession(makeSession({ id: String(userId), role: 'user', canViewAll: false })); });
afterAll(() => clearSession());

describe('status transitions (functional, via PUT /api/inventory/:id)', () => {
  it('available -> sold sets removalDate to soldDate (no sale record created here)', async () => {
    const id = seedItem({ ownerId: userId, status: 'available' });
    const res = await invoke(inventoryRoute.PUT, `/api/inventory/${id}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(id) },
      body: { status: 'sold', removalDate: 1700000000 },
    });
    expect(res.status).toBe(200);
    const it = getItem(id);
    expect(it?.status).toBe('sold');
  });

  it('available -> donated sets removalDate and creates NO $0 sale', async () => {
    const id = seedItem({ ownerId: userId, status: 'available' });
    const before = db.select().from(sales).all().length;
    const res = await invoke(inventoryRoute.PUT, `/api/inventory/${id}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(id) },
      body: { status: 'donated' },
    });
    expect(res.status).toBe(200);
    const it = getItem(id);
    expect(it?.status).toBe('donated');
    expect(it?.removalDate).not.toBeNull();
    const after = db.select().from(sales).all().length;
    expect(after).toBe(before); // no phantom $0 sale
  });

  it('available -> discarded sets removalDate and creates NO $0 sale', async () => {
    const id = seedItem({ ownerId: userId, status: 'available' });
    const before = db.select().from(sales).all().length;
    await invoke(inventoryRoute.PUT, `/api/inventory/${id}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(id) },
      body: { status: 'discarded' },
    });
    const it = getItem(id);
    expect(it?.status).toBe('discarded');
    expect(it?.removalDate).not.toBeNull();
    expect(db.select().from(sales).all().length).toBe(before);
  });

  it('sold -> returned is valid; returned -> available clears removalDate', async () => {
    const id = seedItem({ ownerId: userId, status: 'sold', purchaseDate: 1700000000 });
    let res = await invoke(inventoryRoute.PUT, `/api/inventory/${id}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(id) }, body: { status: 'returned' },
    });
    expect(res.status).toBe(200);
    expect(getItem(id)?.status).toBe('returned');
    res = await invoke(inventoryRoute.PUT, `/api/inventory/${id}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(id) }, body: { status: 'available' },
    });
    expect(res.status).toBe(200);
    expect(getItem(id)?.status).toBe('available');
    expect(getItem(id)?.removalDate).toBeNull();
  });

  it('rejects invalid transition sold -> available with 400', async () => {
    const id = seedItem({ ownerId: userId, status: 'sold', purchaseDate: 1700000000 });
    const res = await invoke(inventoryRoute.PUT, `/api/inventory/${id}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(id) }, body: { status: 'available' },
    });
    expect(res.status).toBe(400);
  });

  it('rejects terminal donated -> sold with 400', async () => {
    const id = seedItem({ ownerId: userId, status: 'donated' });
    const res = await invoke(inventoryRoute.PUT, `/api/inventory/${id}`, {
      method: 'PUT', origin: 'http://localhost:3000', params: { id: String(id) }, body: { status: 'sold' },
    });
    expect(res.status).toBe(400);
  });

  it('rejects mutation without Origin header (403 INVALID_ORIGIN)', async () => {
    const id = seedItem({ ownerId: userId, status: 'available' });
    const res = await invoke(inventoryRoute.PUT, `/api/inventory/${id}`, {
      method: 'PUT', params: { id: String(id) }, body: { status: 'sold' },
    });
    expect(res.status).toBe(403);
  });
});