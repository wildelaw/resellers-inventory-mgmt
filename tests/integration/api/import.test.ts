import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('@/lib/auth', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth')>();
  const { currentSession } = await import('../../helpers/auth-mock');
  return { ...real, auth: async () => currentSession() };
});

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { createTestDb, cleanupTestDb } from '../../setup/db';
import { seedUser } from '../../helpers/seed-data';
import { setSession, makeSession, clearSession } from '../../helpers/auth-mock';
import { invoke } from '../../helpers/api';
import * as importRoute from '@/app/api/import/route';

let dbPath: string;
let userId: number;

beforeAll(async () => {
  dbPath = createTestDb();
  userId = (await seedUser({ email: 'user@example.com', role: 'user' })).id;
});
afterAll(() => { cleanupTestDb(dbPath); clearSession(); });
beforeEach(() => setSession(makeSession({ id: String(userId), role: 'user', canViewAll: false })));

describe('POST /api/import (integration)', () => {
  it('imports inventory rows', async () => {
    const res = await invoke(importRoute.POST, '/api/import', {
      method: 'POST', origin: 'http://localhost:3000',
      body: { type: 'inventory', csvData: 'name,purchase_date,purchase_price\nHat,2024-01-01,25\nShirt,2024-01-02,10' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { success: number }).success).toBe(2);
    expect(db.select().from(items).all().length).toBeGreaterThanOrEqual(2);
  });

  it('imports mileage rows in batches', async () => {
    const res = await invoke(importRoute.POST, '/api/import', {
      method: 'POST', origin: 'http://localhost:3000',
      body: { type: 'mileage', csvData: 'date,miles\n2024-01-01,5\n2024-01-02,10\n2024-01-03,15' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { success: number }).success).toBe(3);
    expect(db.select().from(mileage).all().length).toBeGreaterThanOrEqual(3);
  });

  it('imports sales rows, creating items as needed', async () => {
    const res = await invoke(importRoute.POST, '/api/import', {
      method: 'POST', origin: 'http://localhost:3000',
      body: { type: 'sales', csvData: 'item name,sold price,sold date,platform\nImported Thing,40,2024-02-01,ebay' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { success: number }).success).toBe(1);
    expect(db.select().from(sales).all().length).toBeGreaterThanOrEqual(1);
  });

  it('rejects import without Origin (403)', async () => {
    const res = await invoke(importRoute.POST, '/api/import', {
      method: 'POST', body: { type: 'inventory', csvData: 'name\nX' },
    });
    expect(res.status).toBe(403);
  });

  it('rejects oversized CSV (400)', async () => {
    const big = 'name\n' + 'x'.repeat(1024 * 1024 + 10);
    const res = await invoke(importRoute.POST, '/api/import', {
      method: 'POST', origin: 'http://localhost:3000', body: { type: 'inventory', csvData: big },
    });
    expect(res.status).toBe(400);
  });
});