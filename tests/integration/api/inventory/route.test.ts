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
import * as inventoryRoute from '@/app/api/inventory/route';

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

describe('GET /api/inventory (integration)', () => {
  beforeEach(() => {
    // seed distinct items per owner
    seedItem({ ownerId: adminId, name: 'Admin Jacket', category: 'Clothing' });
    seedItem({ ownerId: userId, name: 'User Hat', category: 'Clothing' });
  });

  it('admin sees all items', async () => {
    setSession(makeSession({ id: String(adminId), role: 'admin', canViewAll: true }));
    const res = await invoke(inventoryRoute.GET, '/api/inventory?pageSize=100', { method: 'GET' });
    expect(res.status).toBe(200);
    const items = (res.body as { items: { name: string }[] }).items;
    expect(items.length).toBeGreaterThanOrEqual(2);
  });

  it('regular user sees only own items', async () => {
    setSession(makeSession({ id: String(userId), role: 'user', canViewAll: false }));
    const res = await invoke(inventoryRoute.GET, '/api/inventory?pageSize=100', { method: 'GET' });
    const items = (res.body as { items: { name: string; ownerId: number }[] }).items;
    expect(items.every((i) => i.ownerId === userId)).toBe(true);
    expect(items.some((i) => i.name === 'Admin Jacket')).toBe(false);
  });

  it('canViewAll user sees all items', async () => {
    setSession(makeSession({ id: String(canViewAllId), role: 'user', canViewAll: true }));
    const res = await invoke(inventoryRoute.GET, '/api/inventory?pageSize=100', { method: 'GET' });
    const items = (res.body as { items: { name: string }[] }).items;
    expect(items.some((i) => i.name === 'Admin Jacket')).toBe(true);
  });

  it('filters by category and returns category list', async () => {
    setSession(makeSession({ id: String(adminId), role: 'admin', canViewAll: true }));
    const res = await invoke(inventoryRoute.GET, '/api/inventory?category=Clothing', { method: 'GET' });
    const body = res.body as { items: { category: string }[]; categories: string[] };
    expect(body.items.every((i) => i.category === 'Clothing')).toBe(true);
    expect(body.categories).toContain('Clothing');
  });

  it('requires auth (401 without session)', async () => {
    setSession(null);
    const res = await invoke(inventoryRoute.GET, '/api/inventory', { method: 'GET' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/inventory (integration)', () => {
  it('creates an item for the session user (201)', async () => {
    setSession(makeSession({ id: String(userId), role: 'user', canViewAll: false }));
    const res = await invoke(inventoryRoute.POST, '/api/inventory', {
      method: 'POST', origin: 'http://localhost:3000',
      body: { name: 'New Thing', purchaseDate: '2024-01-01', purchasePrice: '15' },
    });
    expect(res.status).toBe(201);
    expect((res.body as { ownerId: number }).ownerId).toBe(userId);
  });

  it('rejects create without Origin (403)', async () => {
    setSession(makeSession({ id: String(userId), role: 'user' }));
    const res = await invoke(inventoryRoute.POST, '/api/inventory', {
      method: 'POST', body: { name: 'X', purchaseDate: '2024-01-01', purchasePrice: '1' },
    });
    expect(res.status).toBe(403);
  });

  it('rejects invalid body (400)', async () => {
    setSession(makeSession({ id: String(userId), role: 'user' }));
    const res = await invoke(inventoryRoute.POST, '/api/inventory', {
      method: 'POST', origin: 'http://localhost:3000', body: { purchaseDate: '2024-01-01', purchasePrice: '1' },
    });
    expect(res.status).toBe(400);
  });
});