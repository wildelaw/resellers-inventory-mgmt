import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupTestDb } from '../../../setup/db';
import { mockSession } from '../../../setup/session';
import { jsonRequest, paramsCtx } from '../../../setup/request';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
let route: typeof import('@/app/api/sales/[id]/route');

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  route = await import('@/app/api/sales/[id]/route');

  const { users } = await import('@/lib/schema');
  await db.insert(users).values([
    { id: 1, email: 'alice@test.com', passwordHash: 'x', name: 'Alice', role: 'admin', canViewAll: true, isActive: true, passwordChangedAt: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, email: 'bob@test.com', passwordHash: 'x', name: 'Bob', role: 'user', canViewAll: false, isActive: true, passwordChangedAt: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 3, email: 'carol@test.com', passwordHash: 'x', name: 'Carol', role: 'user', canViewAll: true, isActive: true, passwordChangedAt: 0, createdAt: new Date(), updatedAt: new Date() },
  ]);
});

beforeEach(async () => {
  const { auth } = await import('@/lib/auth');
  vi.mocked(auth).mockReset();
});

let counter = 0;
async function seedSale(soldBy: number, itemId: number | null = null, price = 100): Promise<number> {
  const { sales } = await import('@/lib/schema');
  counter++;
  const [row] = await db.insert(sales).values({
    itemId,
    soldDate: new Date('2026-03-15'),
    soldPrice: price,
    platform: 'ebay' as never,
    soldBy,
    createdAt: new Date(),
  }).returning();
  return row.id;
}

describe('GET /api/sales/:id', () => {
  it('returns the sale for its owner', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedSale(2);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.GET(jsonRequest(`http://localhost:3000/api/sales/${id}`, 'GET'), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(id);
    expect(body.soldBy).toBe(2);
  });

  it('returns 404 for a nonexistent sale', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.GET(jsonRequest('http://localhost:3000/api/sales/999999', 'GET'), paramsCtx({ id: '999999' }));
    expect(res.status).toBe(404);
  });

  it('allows a canViewAll user to READ another users sale but not edit it', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedSale(2);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 3, role: 'user', canViewAll: true }) as never);
    const get = await route.GET(jsonRequest(`http://localhost:3000/api/sales/${id}`, 'GET'), paramsCtx({ id: String(id) }));
    expect(get.status).toBe(200);

    const res = await route.PUT(jsonRequest(`http://localhost:3000/api/sales/${id}`, 'PUT', { soldPrice: 1 }), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(403);
  });

  it('allows admin to view any sale', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedSale(2);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 1, role: 'admin' }) as never);
    const res = await route.GET(jsonRequest(`http://localhost:3000/api/sales/${id}`, 'GET'), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(200);
  });
});

describe('PUT /api/sales/:id', () => {
  it('updates editable sale fields for the owner', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedSale(2);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.PUT(jsonRequest(`http://localhost:3000/api/sales/${id}`, 'PUT', {
      soldPrice: 150, shippingCost: 5,
    }), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.soldPrice).toBe(150);
  });

  it('rejects editing another users sale as a standard user', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedSale(2);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 3, role: 'user', canViewAll: true }) as never);
    const res = await route.PUT(jsonRequest(`http://localhost:3000/api/sales/${id}`, 'PUT', {
      soldPrice: 1,
    }), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(403);
  });

  it('rejects invalid values with 400', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedSale(2);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.PUT(jsonRequest(`http://localhost:3000/api/sales/${id}`, 'PUT', {
      soldPrice: -10,
    }), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/sales/:id', () => {
  it('deletes the sale and reverts a linked item to available', async () => {
    const { auth } = await import('@/lib/auth');
    const { items, sales } = await import('@/lib/schema');
    const [item] = await db.insert(items).values({
      name: `Sale Delete Item ${++counter}`,
      purchaseDate: new Date('2026-01-01'),
      purchasePrice: 40,
      status: 'sold' as never,
      ownerId: 2,
      removalDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    const id = await seedSale(2, item.id);

    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.DELETE(jsonRequest(`http://localhost:3000/api/sales/${id}`, 'DELETE'), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(200);

    expect(await db.select().from(sales).where(eq(sales.id, id))).toHaveLength(0);
    const [itemAfter] = await db.select().from(items).where(eq(items.id, item.id));
    expect(itemAfter.status).toBe('available');
    expect(itemAfter.removalDate).toBeNull();
  });

  it('deletes an unlinked sale without side effects', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedSale(2, null);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.DELETE(jsonRequest(`http://localhost:3000/api/sales/${id}`, 'DELETE'), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(200);
  });

  it('rejects deletion by a non-owner standard user', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedSale(2);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 3, role: 'user', canViewAll: true }) as never);
    const res = await route.DELETE(jsonRequest(`http://localhost:3000/api/sales/${id}`, 'DELETE'), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(403);
  });

  it('requires authentication', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedSale(2);
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await route.DELETE(jsonRequest(`http://localhost:3000/api/sales/${id}`, 'DELETE'), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(401);
  });
});