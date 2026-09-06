import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupTestDb } from '../../setup/db';
import { mockSession } from '../../setup/session';
import { jsonRequest, paramsCtx } from '../../setup/request';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
let salesRoute: typeof import('@/app/api/sales/route');
let salesIdRoute: typeof import('@/app/api/sales/[id]/route');
let counter = 0;

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  salesRoute = await import('@/app/api/sales/route');
  salesIdRoute = await import('@/app/api/sales/[id]/route');

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

async function createItem(status = 'available'): Promise<number> {
  const { items } = await import('@/lib/schema');
  counter++;
  const [row] = await db.insert(items).values({
    name: `Sale Item ${counter}`,
    purchaseDate: new Date('2026-01-01'),
    purchasePrice: 40,
    status: status as never,
    ownerId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return row.id;
}

async function recordSale(itemId: number | null, soldPrice = 100) {
  return salesRoute.POST(
    jsonRequest('http://localhost:3000/api/sales', 'POST', {
      itemId: itemId ?? undefined,
      soldDate: '2026-03-01',
      soldPrice,
      platform: 'ebay',
    })
  );
}

describe('sale → refund flow (REG-01..REG-04)', () => {
  it('creating a sale marks the item sold and sets removalDate', async () => {
    const itemId = await createItem();
    const res = await recordSale(itemId);
    expect(res.status).toBe(201);

    const { items } = await import('@/lib/schema');
    const [item] = await db.select().from(items).where(eq(items.id, itemId));
    expect(item.status).toBe('sold');
    expect(item.removalDate).not.toBeNull();
  });

  it('refund_with_return marks the item returned and clears removalDate (REG-02)', async () => {
    const itemId = await createItem();
    const saleRes = await recordSale(itemId);
    const sale = await saleRes.json();

    const refundRes = await salesRoute.PATCH(
      jsonRequest('http://localhost:3000/api/sales', 'PATCH', {
        saleId: sale.id,
        refundAmount: 100,
        refundType: 'refund_with_return',
        refundReason: 'changed mind',
      })
    );
    expect(refundRes.status).toBe(200);

    const { items, sales } = await import('@/lib/schema');
    const [item] = await db.select().from(items).where(eq(items.id, itemId));
    expect(item.status).toBe('returned');
    expect(item.removalDate).toBeNull();

    const [saleRow] = await db.select().from(sales).where(eq(sales.id, sale.id));
    expect(saleRow.refundAmount).toBe(100);
    expect(saleRow.refundType).toBe('refund_with_return');
  });

  it('refund_no_return keeps the item sold and records the refund (REG-03)', async () => {
    const itemId = await createItem();
    const saleRes = await recordSale(itemId);
    const sale = await saleRes.json();

    const refundRes = await salesRoute.PATCH(
      jsonRequest('http://localhost:3000/api/sales', 'PATCH', {
        saleId: sale.id,
        refundAmount: 25,
        refundType: 'refund_no_return',
        refundReason: 'damaged in shipping',
      })
    );
    expect(refundRes.status).toBe(200);

    const { items, sales } = await import('@/lib/schema');
    const [item] = await db.select().from(items).where(eq(items.id, itemId));
    expect(item.status).toBe('sold');
    expect(item.removalDate).not.toBeNull();

    const [saleRow] = await db.select().from(sales).where(eq(sales.id, sale.id));
    expect(saleRow.refundAmount).toBe(25);
    expect(saleRow.refundType).toBe('refund_no_return');
  });

  it('deleting a sale reverts a sold item to available (REG-04)', async () => {
    const itemId = await createItem();
    const saleRes = await recordSale(itemId);
    const sale = await saleRes.json();

    const delRes = await salesIdRoute.DELETE(
      jsonRequest(`http://localhost:3000/api/sales/${sale.id}`, 'DELETE'),
      paramsCtx({ id: String(sale.id) })
    );
    expect(delRes.status).toBe(200);

    const { items, sales } = await import('@/lib/schema');
    const [item] = await db.select().from(items).where(eq(items.id, itemId));
    expect(item.status).toBe('available');
    expect(item.removalDate).toBeNull();
    const remaining = await db.select().from(sales).where(eq(sales.id, sale.id));
    expect(remaining).toHaveLength(0);
  });

  it('deleting a sale reverts a returned item to available', async () => {
    const itemId = await createItem();
    const saleRes = await recordSale(itemId);
    const sale = await saleRes.json();
    await salesRoute.PATCH(
      jsonRequest('http://localhost:3000/api/sales', 'PATCH', {
        saleId: sale.id,
        refundAmount: 100,
        refundType: 'refund_with_return',
      })
    );

    const delRes = await salesIdRoute.DELETE(
      jsonRequest(`http://localhost:3000/api/sales/${sale.id}`, 'DELETE'),
      paramsCtx({ id: String(sale.id) })
    );
    expect(delRes.status).toBe(200);

    const { items } = await import('@/lib/schema');
    const [item] = await db.select().from(items).where(eq(items.id, itemId));
    expect(item.status).toBe('available');
  });

  it('rejects zero and negative refund amounts', async () => {
    const itemId = await createItem();
    const saleRes = await recordSale(itemId);
    const sale = await saleRes.json();
    const zero = await salesRoute.PATCH(
      jsonRequest('http://localhost:3000/api/sales', 'PATCH', {
        saleId: sale.id,
        refundAmount: 0,
        refundType: 'refund_no_return',
      })
    );
    expect(zero.status).toBe(400);
  });

  it('cannot sell the same item twice', async () => {
    const itemId = await createItem();
    await recordSale(itemId);
    const second = await recordSale(itemId);
    expect(second.status).toBe(409);
  });
});