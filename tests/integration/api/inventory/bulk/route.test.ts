import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { inArray } from 'drizzle-orm';
import { setupTestDb } from '../../../../setup/db';
import { mockSession } from '../../../../setup/session';
import { jsonRequest } from '../../../../setup/request';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
let route: typeof import('@/app/api/inventory/bulk/route');

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  route = await import('@/app/api/inventory/bulk/route');

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
async function seedItems(ownerId: number, status: string, n: number): Promise<number[]> {
  const { items } = await import('@/lib/schema');
  const values = Array.from({ length: n }, () => {
    counter++;
    return {
      name: `Bulk ${counter}`,
      purchaseDate: new Date('2026-01-01'),
      purchasePrice: 10,
      status: status as never,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
  const rows = await db.insert(items).values(values).returning();
  return rows.map((r) => r.id);
}

describe('PATCH /api/inventory/bulk', () => {
  it('updates all requested items to the new status', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const ids = await seedItems(2, 'available', 3);
    const res = await route.PATCH(jsonRequest('http://localhost:3000/api/inventory/bulk', 'PATCH', { ids, status: 'listed' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated.every((r: { status: string }) => r.status === 'listed')).toBe(true);
  });

  it('rejects requests mixing items the caller does not own', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const mine = await seedItems(2, 'available', 1);
    const theirs = await seedItems(1, 'available', 1);
    const res = await route.PATCH(jsonRequest('http://localhost:3000/api/inventory/bulk', 'PATCH', {
      ids: [...mine, ...theirs], status: 'listed',
    }));
    expect(res.status).toBe(403);
  });

  it('rejects invalid transitions for any item without applying any change', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const ok = await seedItems(2, 'available', 2);
    const sold = await seedItems(2, 'sold', 1);
    const res = await route.PATCH(jsonRequest('http://localhost:3000/api/inventory/bulk', 'PATCH', {
      ids: [...ok, ...sold], status: 'listed',
    }));
    expect(res.status).toBe(400);

    const { items } = await import('@/lib/schema');
    const rows = await db.select().from(items).where(inArray(items.id, ok));
    expect(rows.every((r) => r.status === 'available')).toBe(true);
  });

  it('validates the payload shape', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.PATCH(jsonRequest('http://localhost:3000/api/inventory/bulk', 'PATCH', { ids: [], status: 'listed' }));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/inventory/bulk', () => {
  it('deletes all requested items for the owner', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const ids = await seedItems(2, 'available', 2);
    const res = await route.DELETE(jsonRequest(`http://localhost:3000/api/inventory/bulk?ids=${ids.join(',')}`, 'DELETE'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(2);
  });

  it('requires the ids parameter', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.DELETE(jsonRequest('http://localhost:3000/api/inventory/bulk', 'DELETE'));
    expect(res.status).toBe(400);
  });

  it('rejects deleting items owned by someone else (RBAC)', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const ids = await seedItems(1, 'available', 1);
    const res = await route.DELETE(jsonRequest(`http://localhost:3000/api/inventory/bulk?ids=${ids.join(',')}`, 'DELETE'));
    expect(res.status).toBe(403);
  });

  it('requires authentication', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await route.DELETE(jsonRequest('http://localhost:3000/api/inventory/bulk?ids=1', 'DELETE'));
    expect(res.status).toBe(401);
  });
});