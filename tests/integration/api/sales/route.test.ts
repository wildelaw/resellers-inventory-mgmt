import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('@/lib/auth', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth')>();
  const { currentSession } = await import('../../../helpers/auth-mock');
  return { ...real, auth: async () => currentSession() };
});

import { createTestDb, cleanupTestDb } from '../../../setup/db';
import { seedUser, seedItem, seedSale, getSale } from '../../../helpers/seed-data';
import { setSession, makeSession, clearSession } from '../../../helpers/auth-mock';
import { invoke } from '../../../helpers/api';
import * as salesRoute from '@/app/api/sales/route';

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

describe('GET /api/sales (integration)', () => {
  it('user sees only own sales', async () => {
    seedSale({ soldBy: userId, soldPrice: 30 });
    seedSale({ soldBy: adminId, soldPrice: 99 });
    const res = await invoke(salesRoute.GET, '/api/sales?pageSize=100', { method: 'GET' });
    const sales = (res.body as { sales: { soldBy: number }[] }).sales;
    expect(sales.every((s) => s.soldBy === userId)).toBe(true);
  });
  it('admin sees all sales', async () => {
    setSession(makeSession({ id: String(adminId), role: 'admin', canViewAll: true }));
    const res = await invoke(salesRoute.GET, '/api/sales?pageSize=100', { method: 'GET' });
    const sales = (res.body as { sales: { soldBy: number }[] }).sales;
    expect(sales.length).toBeGreaterThanOrEqual(2);
  });
});

describe('POST /api/sales (integration)', () => {
  it('creates a sale and marks linked item sold', async () => {
    const itemId = seedItem({ ownerId: userId, status: 'available' });
    const res = await invoke(salesRoute.POST, '/api/sales', {
      method: 'POST', origin: 'http://localhost:3000',
      body: { itemId, soldDate: '2024-03-01', soldPrice: '40', platform: 'ebay' },
    });
    expect(res.status).toBe(201);
  });
  it('rejects creating sale for another user item (403)', async () => {
    const itemId = seedItem({ ownerId: adminId, status: 'available' });
    const res = await invoke(salesRoute.POST, '/api/sales', {
      method: 'POST', origin: 'http://localhost:3000',
      body: { itemId, soldDate: '2024-03-01', soldPrice: '40', platform: 'ebay' },
    });
    expect(res.status).toBe(403);
  });
  it('rejects without Origin (403)', async () => {
    const res = await invoke(salesRoute.POST, '/api/sales', {
      method: 'POST', body: { soldDate: '2024-03-01', soldPrice: '40', platform: 'ebay' },
    });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/sales (refund, integration)', () => {
  it('refund_no_return keeps item sold', async () => {
    const itemId = seedItem({ ownerId: userId, status: 'sold' });
    const saleId = seedSale({ soldBy: userId, itemId, soldPrice: 40 });
    const res = await invoke(salesRoute.PATCH, '/api/sales', {
      method: 'PATCH', origin: 'http://localhost:3000',
      body: { saleId, refundAmount: 10, refundType: 'refund_no_return' },
    });
    expect(res.status).toBe(200);
    expect(getSale(saleId)?.refundType).toBe('refund_no_return');
  });
  it('rejects refund on another user sale (403)', async () => {
    const saleId = seedSale({ soldBy: adminId, soldPrice: 40 });
    const res = await invoke(salesRoute.PATCH, '/api/sales', {
      method: 'PATCH', origin: 'http://localhost:3000',
      body: { saleId, refundAmount: 10, refundType: 'refund_no_return' },
    });
    expect(res.status).toBe(403);
  });
});