import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupTestDb } from '../../setup/db';
import { mockSession } from '../../setup/session';
import { jsonRequest } from '../../setup/request';
import { calculateProfit, calculateNetRevenue } from '@/lib/financial';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
let salesRoute: typeof import('@/app/api/sales/route');
let counter = 0;

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  salesRoute = await import('@/app/api/sales/route');

  const { users } = await import('@/lib/schema');
  await db.insert(users).values({
    id: 1,
    email: 'owner@test.com',
    passwordHash: 'x',
    name: 'Owner',
    role: 'admin',
    canViewAll: true,
    isActive: true,
    passwordChangedAt: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

beforeEach(async () => {
  const { auth } = await import('@/lib/auth');
  vi.mocked(auth).mockResolvedValue(mockSession({ id: 1 }) as never);
});

async function createAndSell(overrides?: Record<string, unknown>) {
  const { items, sales: salesTable } = await import('@/lib/schema');
  counter++;
  const [item] = await db.insert(items).values({
    name: `Profit Item ${counter}`,
    purchaseDate: new Date('2026-01-01'),
    purchasePrice: 40,
    status: 'available' as never,
    ownerId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  const salePayload = {
    itemId: item.id,
    soldDate: '2026-03-01',
    soldPrice: 100,
    platform: 'ebay',
    ...overrides,
  };
  const res = await salesRoute.POST(jsonRequest('http://localhost:3000/api/sales', 'POST', salePayload));
  expect(res.status).toBe(201);
  const sale = await res.json();
  void salesTable;
  return { item, sale };
}

describe('refund impact on profitability', () => {
  it('full refund reduces profit by the refunded amount', async () => {
    const { sale } = await createAndSell();
    const before = calculateProfit({ ...sale, purchasePrice: 40 });

    const res = await salesRoute.PATCH(
      jsonRequest('http://localhost:3000/api/sales', 'PATCH', {
        saleId: sale.id,
        refundAmount: 30,
        refundType: 'refund_no_return',
      })
    );
    expect(res.status).toBe(200);
    const updated = await res.json();
    const after = calculateProfit({ ...updated, purchasePrice: 40 });

    expect(before).toBe(60); // 100 - 40
    expect(after).toBe(30); // 60 - 30 refund
  });

  it('refund_no_return keeps item sold; refund_with_return marks it returned', async () => {
    const a = await createAndSell();
    await salesRoute.PATCH(
      jsonRequest('http://localhost:3000/api/sales', 'PATCH', {
        saleId: a.sale.id, refundAmount: 100, refundType: 'refund_no_return',
      })
    );
    const { items } = await import('@/lib/schema');
    const [itemA] = await db.select().from(items).where(eq(items.id, a.item.id));
    expect(itemA.status).toBe('sold');

    const b = await createAndSell();
    await salesRoute.PATCH(
      jsonRequest('http://localhost:3000/api/sales', 'PATCH', {
        saleId: b.sale.id, refundAmount: 100, refundType: 'refund_with_return',
      })
    );
    const [itemB] = await db.select().from(items).where(eq(items.id, b.item.id));
    expect(itemB.status).toBe('returned');
  });

  it('net revenue accounts for tax, fees, and refunds', async () => {
    const net = calculateNetRevenue({
      soldPrice: 100,
      shippingCollected: 10,
      salesTax: 8,
      platformFees: 5,
      refundAmount: 20,
    });
    expect(net).toBe(77);
  });

  it('full-refund-with-return sale produces zero revenue after restore', async () => {
    const { sale } = await createAndSell();
    await salesRoute.PATCH(
      jsonRequest('http://localhost:3000/api/sales', 'PATCH', {
        saleId: sale.id, refundAmount: 100, refundType: 'refund_with_return',
      })
    );
    const { sales } = await import('@/lib/schema');
    const [row] = await db.select().from(sales).where(eq(sales.id, sale.id));
    expect(calculateNetRevenue(row)).toBe(0);
  });
});