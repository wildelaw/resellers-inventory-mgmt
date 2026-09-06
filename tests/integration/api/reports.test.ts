import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { setupTestDb } from '../../setup/db';
import { mockSession } from '../../setup/session';
import { jsonRequest } from '../../setup/request';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
let route: typeof import('@/app/api/reports/route');

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  route = await import('@/app/api/reports/route');

  const { users } = await import('@/lib/schema');
  await db.insert(users).values([
    { id: 1, email: 'alice@test.com', passwordHash: 'x', name: 'Alice', role: 'admin', canViewAll: true, isActive: true, passwordChangedAt: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, email: 'bob@test.com', passwordHash: 'x', name: 'Bob', role: 'user', canViewAll: false, isActive: true, passwordChangedAt: 0, createdAt: new Date(), updatedAt: new Date() },
  ]);
});

beforeEach(async () => {
  const { auth } = await import('@/lib/auth');
  vi.mocked(auth).mockReset();
});

let counter = 0;
async function seedSaleData(opts: {
  ownerId: number;
  status?: string;
  purchasePrice?: number;
  sale?: { soldPrice: number; soldDate: Date; platform?: string; shippingCollected?: number; platformFees?: number; salesTax?: number; refundAmount?: number };
}) {
  const { items, sales } = await import('@/lib/schema');
  counter++;
  const [item] = await db.insert(items).values({
    name: `Report Item ${counter}`,
    purchaseDate: new Date('2026-02-01'),
    purchasePrice: opts.purchasePrice ?? 20,
    status: (opts.status ?? (opts.sale ? 'sold' : 'available')) as never,
    ownerId: opts.ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  if (opts.sale) {
    await db.insert(sales).values({
      itemId: item.id,
      soldDate: opts.sale.soldDate,
      soldPrice: opts.sale.soldPrice,
      shippingCollected: opts.sale.shippingCollected ?? 0,
      platformFees: opts.sale.platformFees ?? 0,
      salesTax: opts.sale.salesTax ?? 0,
      refundAmount: opts.sale.refundAmount ?? 0,
      platform: (opts.sale.platform ?? 'ebay') as never,
      soldBy: opts.ownerId,
      createdAt: new Date(),
    });
  }
  return item.id;
}

describe('GET /api/reports', () => {
  it('returns inventory and sales aggregates', async () => {
    const { auth } = await import('@/lib/auth');
    await seedSaleData({
      ownerId: 2, purchasePrice: 50,
      sale: { soldPrice: 120, soldDate: new Date('2026-03-10'), platform: 'ebay', shippingCollected: 5, platformFees: 10, salesTax: 7 },
    });
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/reports'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.inventory.totalItems).toBeGreaterThan(0);
    expect(body.inventory.byStatus.sold).toBeGreaterThan(0);
    expect(body.sales.count).toBeGreaterThan(0);
    expect(body.sales.totalRevenue).toBeGreaterThan(0);
    expect(typeof body.sales.totalProfit).toBe('number');
    expect(Array.isArray(body.byPlatform)).toBe(true);
    expect(body.byPlatform[0]).toMatchObject({ platform: expect.any(String), count: expect.any(Number) });
    expect(Array.isArray(body.monthly)).toBe(true);
  });

  it('computes profit with the single-source financial functions', async () => {
    const { auth } = await import('@/lib/auth');
    const { calculateProfit, calculateNetRevenue } = await import('@/lib/financial');
    await seedSaleData({
      ownerId: 2, purchasePrice: 40,
      sale: { soldPrice: 100, soldDate: new Date('2026-04-01'), shippingCollected: 10, platformFees: 5, salesTax: 8 },
    });
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/reports?startDate=2026-04-01&endDate=2026-04-30'));
    const body = await res.json();
    // Only this sale falls in the date window
    const expectedProfit = calculateProfit({
      soldPrice: 100, shippingCollected: 10, platformFees: 5, salesTax: 8, shippingCost: 0, refundAmount: 0, purchasePrice: 40,
    } as never);
    expect(body.sales.totalProfit).toBeCloseTo(expectedProfit, 2);
    expect(body.sales.totalNetRevenue).toBeCloseTo(calculateNetRevenue({
      soldPrice: 100, shippingCollected: 10, platformFees: 5, salesTax: 8, shippingCost: 0, refundAmount: 0,
    } as never), 2);
  });

  it('filters sales by date range', async () => {
    const { auth } = await import('@/lib/auth');
    await seedSaleData({ ownerId: 2, sale: { soldPrice: 80, soldDate: new Date('2026-01-15') } });
    await seedSaleData({ ownerId: 2, sale: { soldPrice: 90, soldDate: new Date('2026-05-20') } });
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.GET(new (await import('next/server')).NextRequest(
      'http://localhost:3000/api/reports?startDate=2026-05-01&endDate=2026-05-31'
    ));
    const body = await res.json();
    expect(body.sales.count).toBe(1);
    expect(body.sales.totalRevenue).toBe(90);
  });

  it('scopes standard users to their own data', async () => {
    const { auth } = await import('@/lib/auth');
    await seedSaleData({ ownerId: 1, sale: { soldPrice: 500, soldDate: new Date('2026-06-01') } });
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user', canViewAll: false }) as never);
    const res = await route.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/reports'));
    const body = await res.json();
    expect(body.sales.count).toBe(body.byPlatform.reduce((sum: number, p: { count: number }) => sum + p.count, 0));
    // The admin's $500 sale must not appear anywhere
    expect(body.byPlatform.some((p: { totalRevenue: number }) => p.totalRevenue >= 500)).toBe(false);
  });

  it('requires authentication', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await route.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/reports'));
    expect(res.status).toBe(401);
  });
});