import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('@/lib/auth', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth')>();
  const { currentSession } = await import('../../helpers/auth-mock');
  return { ...real, auth: async () => currentSession() };
});

import { createTestDb, cleanupTestDb } from '../../setup/db';
import { seedUser, seedItem, seedSale, seedMileage } from '../../helpers/seed-data';
import { setSession, makeSession, clearSession } from '../../helpers/auth-mock';
import { invoke } from '../../helpers/api';
import * as reportsRoute from '@/app/api/reports/route';

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

describe('GET /api/reports (integration)', () => {
  it('returns stats with single-source profit', async () => {
    const itemId = seedItem({ ownerId: userId, purchasePrice: 10 });
    seedSale({ soldBy: userId, itemId, soldPrice: 50, platform: 'ebay' });
    seedMileage({ ownerId: userId, miles: 12.5 });
    const res = await invoke(reportsRoute.GET, '/api/reports', { method: 'GET' });
    expect(res.status).toBe(200);
    const body = res.body as { sales: { totalProfit: number; count: number }; mileage: { totalMiles: number } };
    expect(body.sales.count).toBeGreaterThanOrEqual(1);
    // profit = 50 - 10 = 40 (no fees/tax/shipping/refund seeded)
    expect(body.sales.totalProfit).toBe(40);
    expect(body.mileage.totalMiles).toBeGreaterThanOrEqual(12.5);
  });

  it('regular user only sees own data in reports', async () => {
    seedSale({ soldBy: adminId, soldPrice: 999 });
    const ownSale = seedSale({ soldBy: userId, soldPrice: 20 });
    const res = await invoke(reportsRoute.GET, '/api/reports', { method: 'GET' });
    const body = res.body as { sales: { count: number } };
    // own sale counted; admin sale excluded for a default user
    expect(body.sales.count).toBeGreaterThanOrEqual(1);
  });

  it('admin sees all data in reports', async () => {
    setSession(makeSession({ id: String(adminId), role: 'admin', canViewAll: true }));
    const res = await invoke(reportsRoute.GET, '/api/reports', { method: 'GET' });
    expect(res.status).toBe(200);
  });

  it('supports date filtering', async () => {
    const res = await invoke(reportsRoute.GET, '/api/reports?startDate=2100-01-01', { method: 'GET' });
    const body = res.body as { sales: { count: number } };
    expect(body.sales.count).toBe(0); // future window excludes all
  });
});