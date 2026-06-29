import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('@/lib/auth', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth')>();
  const { currentSession } = await import('../../helpers/auth-mock');
  return { ...real, auth: async () => currentSession() };
});

import { createTestDb, cleanupTestDb } from '../../setup/db';
import { seedUser, seedItem, getItem, getSale } from '../../helpers/seed-data';
import { setSession, makeSession, clearSession } from '../../helpers/auth-mock';
import { invoke } from '../../helpers/api';
import * as salesRoute from '@/app/api/sales/route';
import * as saleIdRoute from '@/app/api/sales/[id]/route';

let dbPath: string;
let userId: number;

beforeAll(async () => {
  dbPath = createTestDb();
  const u = await seedUser({ email: 'seller@example.com' });
  userId = u.id;
});
afterAll(() => { cleanupTestDb(dbPath); clearSession(); });
beforeEach(() => { setSession(makeSession({ id: String(userId), role: 'user', canViewAll: false })); });

describe('sale / refund flow (functional)', () => {
  it('REG-01: create sale -> item becomes sold + removalDate set', async () => {
    const itemId = seedItem({ ownerId: userId, status: 'available', purchasePrice: 10 });
    const res = await invoke(salesRoute.POST, '/api/sales', {
      method: 'POST', origin: 'http://localhost:3000',
      body: { itemId, soldDate: '2024-02-01', soldPrice: '50', platform: 'ebay', platformFees: '5', shippingCollected: '10', shippingCost: '8' },
    });
    expect(res.status).toBe(201);
    const it = getItem(itemId);
    expect(it?.status).toBe('sold');
    expect(it?.removalDate).not.toBeNull();
  });

  it('REG-02: refund_with_return -> item becomes returned, removalDate cleared', async () => {
    const itemId = seedItem({ ownerId: userId, status: 'available', purchasePrice: 10 });
    const saleRes = await invoke(salesRoute.POST, '/api/sales', {
      method: 'POST', origin: 'http://localhost:3000',
      body: { itemId, soldDate: '2024-02-01', soldPrice: '50', platform: 'local' },
    });
    const saleId = (saleRes.body as { id: number }).id;
    const res = await invoke(salesRoute.PATCH, '/api/sales', {
      method: 'PATCH', origin: 'http://localhost:3000',
      body: { saleId, refundAmount: '20', refundType: 'refund_with_return', refundReason: 'damaged' },
    });
    expect(res.status).toBe(200);
    const it = getItem(itemId);
    expect(it?.status).toBe('returned');
    expect(it?.removalDate).toBeNull();
    const sale = getSale(saleId);
    expect(sale?.refundType).toBe('refund_with_return');
    expect(Number(sale?.refundAmount)).toBe(20);
  });

  it('REG-03: refund_no_return -> item stays sold, refund recorded', async () => {
    const itemId = seedItem({ ownerId: userId, status: 'available', purchasePrice: 10 });
    const saleRes = await invoke(salesRoute.POST, '/api/sales', {
      method: 'POST', origin: 'http://localhost:3000',
      body: { itemId, soldDate: '2024-02-01', soldPrice: '50', platform: 'local' },
    });
    const saleId = (saleRes.body as { id: number }).id;
    await invoke(salesRoute.PATCH, '/api/sales', {
      method: 'PATCH', origin: 'http://localhost:3000',
      body: { saleId, refundAmount: '15', refundType: 'refund_no_return', refundReason: 'partial' },
    });
    const it = getItem(itemId);
    expect(it?.status).toBe('sold');
    const sale = getSale(saleId);
    expect(sale?.refundType).toBe('refund_no_return');
    expect(Number(sale?.refundAmount)).toBe(15);
  });

  it('REG-04: delete sale -> item reverts to available', async () => {
    const itemId = seedItem({ ownerId: userId, status: 'available', purchasePrice: 10 });
    const saleRes = await invoke(salesRoute.POST, '/api/sales', {
      method: 'POST', origin: 'http://localhost:3000',
      body: { itemId, soldDate: '2024-02-01', soldPrice: '50', platform: 'local' },
    });
    const saleId = (saleRes.body as { id: number }).id;
    expect(getItem(itemId)?.status).toBe('sold');
    const res = await invoke(saleIdRoute.DELETE, `/api/sales/${saleId}`, {
      method: 'DELETE', origin: 'http://localhost:3000', params: { id: String(saleId) },
    });
    expect(res.status).toBe(200);
    expect(getItem(itemId)?.status).toBe('available');
    expect(getItem(itemId)?.removalDate).toBeNull();
  });

  it('rejects creating a sale for an already-sold item (409)', async () => {
    const itemId = seedItem({ ownerId: userId, status: 'sold', purchasePrice: 10 });
    const res = await invoke(salesRoute.POST, '/api/sales', {
      method: 'POST', origin: 'http://localhost:3000',
      body: { itemId, soldDate: '2024-02-01', soldPrice: '50', platform: 'local' },
    });
    expect(res.status).toBe(409);
  });

  it('rejects sale mutation without Origin (403)', async () => {
    const res = await invoke(salesRoute.POST, '/api/sales', {
      method: 'POST',
      body: { soldDate: '2024-02-01', soldPrice: '50', platform: 'local' },
    });
    expect(res.status).toBe(403);
  });
});