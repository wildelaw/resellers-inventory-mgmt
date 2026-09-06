import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupTestDb } from '../../../setup/db';
import { mockSession } from '../../../setup/session';
import { jsonRequest } from '../../../setup/request';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
let route: typeof import('@/app/api/sales/route');
let inventoryRoute: typeof import('@/app/api/inventory/route');

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  route = await import('@/app/api/sales/route');
  inventoryRoute = await import('@/app/api/inventory/route');

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

async function createItem(ownerId: number, status = 'available'): Promise<number> {
  const { items } = await import('@/lib/schema');
  const [row] = await db.insert(items).values({
    name: `Sales Route Item ${Math.random()}`,
    purchaseDate: new Date('2026-01-01'),
    purchasePrice: 30,
    status: status as never,
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return row.id;
}

describe('GET /api/sales', () => {
  it('lists sales with pagination', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/sales'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.pagination).toBeDefined();
  });

  it('scopes sales to the owner for standard users', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/sales'));
    const body = await res.json();
    for (const sale of body.items) expect(sale.soldBy).toBe(2);
  });

  it('filters by platform and date range', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 1, role: 'admin' }) as never);
    const res = await route.GET(new (await import('next/server')).NextRequest(
      'http://localhost:3000/api/sales?platform=ebay&startDate=2026-01-01&endDate=2026-12-31'
    ));
    const body = await res.json();
    for (const sale of body.items) expect(sale.platform).toBe('ebay');
  });
});

describe('POST /api/sales', () => {
  it('creates a linked sale and marks the item sold', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const itemId = await createItem(2);
    const res = await route.POST(jsonRequest('http://localhost:3000/api/sales', 'POST', {
      itemId, soldDate: '2026-03-15', soldPrice: 120, platform: 'ebay',
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.itemId).toBe(itemId);

    const { items } = await import('@/lib/schema');
    const [item] = await db.select().from(items).where(eq(items.id, itemId));
    expect(item.status).toBe('sold');
    expect(item.removalDate).not.toBeNull();
  });

  it('creates an unlinked sale without touching inventory', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.POST(jsonRequest('http://localhost:3000/api/sales', 'POST', {
      soldDate: '2026-03-16', soldPrice: 25, platform: 'local',
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.itemId ?? null).toBeNull();
  });

  it('rejects invalid payloads with 400', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await route.POST(jsonRequest('http://localhost:3000/api/sales', 'POST', {
      soldDate: '2026-03-16', soldPrice: -5, platform: 'mars',
    }));
    expect(res.status).toBe(400);
  });

  it('rejects selling an already-sold item with 409', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const itemId = await createItem(2, 'sold');
    const res = await route.POST(jsonRequest('http://localhost:3000/api/sales', 'POST', {
      itemId, soldDate: '2026-03-15', soldPrice: 120, platform: 'ebay',
    }));
    expect(res.status).toBe(409);
  });

  it('rejects unauthenticated requests', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await route.POST(jsonRequest('http://localhost:3000/api/sales', 'POST', {
      soldDate: '2026-03-16', soldPrice: 25, platform: 'local',
    }));
    expect(res.status).toBe(401);
  });

  it('exercises the inventory list route for completeness', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 1, role: 'admin' }) as never);
    const res = await inventoryRoute.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/inventory?pageSize=5'));
    expect(res.status).toBe(200);
  });
});