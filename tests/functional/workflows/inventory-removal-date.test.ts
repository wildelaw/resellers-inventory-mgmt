import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { setupTestDb } from '../../setup/db';
import { mockSession } from '../../setup/session';
import { jsonRequest } from '../../setup/request';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
let bulkRoute: typeof import('@/app/api/inventory/bulk/route');
let idRoute: typeof import('@/app/api/inventory/[id]/route');
let counter = 0;

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  bulkRoute = await import('@/app/api/inventory/bulk/route');
  idRoute = await import('@/app/api/inventory/[id]/route');

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

async function createItems(status: string, n: number): Promise<number[]> {
  const { items } = await import('@/lib/schema');
  const values = Array.from({ length: n }, () => {
    counter++;
    return {
      name: `Bulk Item ${counter}`,
      purchaseDate: new Date('2026-01-01'),
      purchasePrice: 10,
      status: status as never,
      ownerId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
  const rows = await db.insert(items).values(values).returning();
  return rows.map((r) => r.id);
}

describe('removalDate side effects (REG-05, REG-13, REG-14)', () => {
  it('bulk marking donated sets removalDate and creates NO $0 sales', async () => {
    const ids = await createItems('available', 3);
    const res = await bulkRoute.PATCH(
      jsonRequest('http://localhost:3000/api/inventory/bulk', 'PATCH', { ids, status: 'donated' })
    );
    expect(res.status).toBe(200);

    const { items, sales } = await import('@/lib/schema');
    const rows = await db.select().from(items).where(inArray(items.id, ids));
    for (const row of rows) {
      expect(row.status).toBe('donated');
      expect(row.removalDate).not.toBeNull();
    }
    // No $0 auto-sales for donated items
    expect(await db.select().from(sales)).toHaveLength(0);
  });

  it('bulk marking discarded sets removalDate', async () => {
    const ids = await createItems('listed', 2);
    const res = await bulkRoute.PATCH(
      jsonRequest('http://localhost:3000/api/inventory/bulk', 'PATCH', { ids, status: 'discarded' })
    );
    expect(res.status).toBe(200);
    const { items } = await import('@/lib/schema');
    const rows = await db.select().from(items).where(inArray(items.id, ids));
    for (const row of rows) expect(row.removalDate).not.toBeNull();
  });

  it('returned → available clears removalDate (REG-14)', async () => {
    const [itemId] = await createItems('available', 1);
    // available → sold sets removalDate
    await idRoute.PUT(
      jsonRequest(`http://localhost:3000/api/inventory/${itemId}`, 'PUT', { status: 'sold' }),
      { params: Promise.resolve({ id: String(itemId) }) }
    );
    const { items } = await import('@/lib/schema');
    let [row] = await db.select().from(items).where(eq(items.id, itemId));
    expect(row.removalDate).not.toBeNull();

    // sold → returned keeps the item tracked
    await idRoute.PUT(
      jsonRequest(`http://localhost:3000/api/inventory/${itemId}`, 'PUT', { status: 'returned' }),
      { params: Promise.resolve({ id: String(itemId) }) }
    );
    [row] = await db.select().from(items).where(eq(items.id, itemId));
    expect(row.status).toBe('returned');

    // returned → available clears removalDate
    await idRoute.PUT(
      jsonRequest(`http://localhost:3000/api/inventory/${itemId}`, 'PUT', { status: 'available' }),
      { params: Promise.resolve({ id: String(itemId) }) }
    );
    [row] = await db.select().from(items).where(eq(items.id, itemId));
    expect(row.status).toBe('available');
    expect(row.removalDate).toBeNull();
  });

  it('rejects the whole bulk update when any transition is invalid', async () => {
    const okIds = await createItems('available', 2);
    const soldIds = await createItems('sold', 1);
    const res = await bulkRoute.PATCH(
      jsonRequest('http://localhost:3000/api/inventory/bulk', 'PATCH', {
        ids: [...okIds, ...soldIds],
        status: 'discarded', // sold → discarded is invalid
      })
    );
    expect(res.status).toBe(400);

    // No items were touched
    const { items } = await import('@/lib/schema');
    const rows = await db.select().from(items).where(inArray(items.id, [...okIds, ...soldIds]));
    for (const row of rows) {
      if (okIds.includes(row.id)) expect(row.status).toBe('available');
      else expect(row.status).toBe('sold');
    }
  });

  it('bulk delete removes items and cascades', async () => {
    const ids = await createItems('available', 2);
    const res = await bulkRoute.DELETE(
      jsonRequest(`http://localhost:3000/api/inventory/bulk?ids=${ids.join(',')}`, 'DELETE')
    );
    expect(res.status).toBe(200);
    const { items } = await import('@/lib/schema');
    expect(await db.select().from(items).where(inArray(items.id, ids))).toHaveLength(0);
  });
});