import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupTestDb } from '../../../setup/db';
import { mockSession } from '../../../setup/session';
import { jsonRequest, paramsCtx } from '../../../setup/request';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
let route: typeof import('@/app/api/inventory/[id]/route');

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  route = await import('@/app/api/inventory/[id]/route');

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
async function seedItem(ownerId: number, status = 'available'): Promise<number> {
  const { items } = await import('@/lib/schema');
  counter++;
  const [row] = await db.insert(items).values({
    name: `Detail Item ${counter}`,
    purchaseDate: new Date('2026-01-01'),
    purchasePrice: 20,
    status: status as never,
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return row.id;
}

describe('GET /api/inventory/:id', () => {
  it('returns the item with photos and sales for the owner', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedItem(2);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.GET(jsonRequest(`http://localhost:3000/api/inventory/${id}`, 'GET'), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(id);
    expect(Array.isArray(body.photos)).toBe(true);
    expect(Array.isArray(body.sales)).toBe(true);
  });

  it('returns 404 for a nonexistent item', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.GET(jsonRequest('http://localhost:3000/api/inventory/999999', 'GET'), paramsCtx({ id: '999999' }));
    expect(res.status).toBe(404);
  });

  it('hides other users items from standard users (REG-09)', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedItem(1);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.GET(jsonRequest(`http://localhost:3000/api/inventory/${id}`, 'GET'), paramsCtx({ id: String(id) }));
    expect([403, 404]).toContain(res.status);
  });

  it('allows a canViewAll user to READ another users item but not edit it (REG-10)', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedItem(2);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 3, role: 'user', canViewAll: true }) as never);

    const get = await route.GET(jsonRequest(`http://localhost:3000/api/inventory/${id}`, 'GET'), paramsCtx({ id: String(id) }));
    expect(get.status).toBe(200);

    const put = await route.PUT(jsonRequest(`http://localhost:3000/api/inventory/${id}`, 'PUT', { name: 'Hijacked' }), paramsCtx({ id: String(id) }));
    expect(put.status).toBe(403);
  });
});

describe('PUT /api/inventory/:id', () => {
  it('updates fields and rejects invalid transitions (REG-12)', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedItem(2);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);

    const put = await route.PUT(jsonRequest(`http://localhost:3000/api/inventory/${id}`, 'PUT', { name: 'Renamed' }), paramsCtx({ id: String(id) }));
    expect(put.status).toBe(200);
    expect((await put.json()).name).toBe('Renamed');

    const bad = await route.PUT(jsonRequest(`http://localhost:3000/api/inventory/${id}`, 'PUT', { status: 'sold' }), paramsCtx({ id: String(id) }));
    expect(bad.status).toBe(200);

    // From 'sold', the only valid transition is 'returned' — anything else is invalid
    const res2 = await route.PUT(jsonRequest(`http://localhost:3000/api/inventory/${id}`, 'PUT', { status: 'listed' }), paramsCtx({ id: String(id) }));
    expect(res2.status).toBe(400);
  });

  it('prevents non-admin users from editing others items', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedItem(2);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 3, role: 'user', canViewAll: true }) as never);
    const res = await route.PUT(jsonRequest(`http://localhost:3000/api/inventory/${id}`, 'PUT', { name: 'Nope' }), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(403);
  });

  it('allows admin to edit any item (REG-11)', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedItem(2);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 1, role: 'admin' }) as never);
    const res = await route.PUT(jsonRequest(`http://localhost:3000/api/inventory/${id}`, 'PUT', { notes: 'Admin edited' }), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/inventory/:id', () => {
  it('deletes the item and its related rows for the owner', async () => {
    const { auth } = await import('@/lib/auth');
    const { items, sales, photos } = await import('@/lib/schema');
    const id = await seedItem(2, 'sold');
    await db.insert(sales).values({
      itemId: id, soldDate: new Date(), soldPrice: 30, platform: 'ebay' as never, soldBy: 2, createdAt: new Date(),
    });
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);

    const res = await route.DELETE(jsonRequest(`http://localhost:3000/api/inventory/${id}`, 'DELETE'), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(200);

    expect(await db.select().from(items).where(eq(items.id, id))).toHaveLength(0);
    expect(await db.select().from(sales).where(eq(sales.itemId, id))).toHaveLength(0);
    void photos;
  });

  it('rejects deletion by a non-owner standard user', async () => {
    const { auth } = await import('@/lib/auth');
    const id = await seedItem(2);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 3, role: 'user', canViewAll: true }) as never);
    const res = await route.DELETE(jsonRequest(`http://localhost:3000/api/inventory/${id}`, 'DELETE'), paramsCtx({ id: String(id) }));
    expect(res.status).toBe(403);
  });
});