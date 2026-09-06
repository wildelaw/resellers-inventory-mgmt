import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupTestDb } from '../../../setup/db';
import { mockSession } from '../../../setup/session';
import { jsonRequest } from '../../../setup/request';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
let route: typeof import('@/app/api/inventory/route');

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  route = await import('@/app/api/inventory/route');

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
async function seedItems(ownerId: number, statuses: string[], names?: string[]) {
  const { items } = await import('@/lib/schema');
  const values = statuses.map((status, idx) => {
    counter++;
    return {
      name: names?.[idx] ?? `Item ${counter}`,
      purchaseDate: new Date('2026-01-01'),
      purchasePrice: 10 + idx,
      status: status as never,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
  return db.insert(items).values(values).returning();
}

describe('GET /api/inventory', () => {
  it('returns items with pagination metadata', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 1, role: 'admin' }) as never);
    await seedItems(1, ['available', 'available', 'listed']);

    const res = await route.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/inventory'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBeGreaterThanOrEqual(3);
    expect(body.pagination).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('filters by status', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 1, role: 'admin' }) as never);
    const res = await route.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/inventory?status=listed'));
    const body = await res.json();
    for (const item of body.items) expect(item.status).toBe('listed');
  });

  it('searches names with LIKE-escaped input', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 1, role: 'admin' }) as never);
    await seedItems(1, ['available'], ['Unique%Lamp_100']);

    // Searching for a literal % must be escaped, not treated as a wildcard
    const res = await route.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/inventory?search=Unique%25Lamp_100'));
    const body = await res.json();
    expect(body.items.some((i: { name: string }) => i.name === 'Unique%Lamp_100')).toBe(true);

    // A plain wildcard search for other names should not match it
    const res2 = await route.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/inventory?search=zzznope'));
    expect((await res2.json()).items).toHaveLength(0);
  });

  it('sorts by a whitelisted field', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 1, role: 'admin' }) as never);
    const res = await route.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/inventory?sortBy=purchasePrice&sortDir=desc'));
    const body = await res.json();
    const prices = body.items.map((i: { purchasePrice: number }) => i.purchasePrice);
    expect([...prices].sort((a: number, b: number) => b - a)).toEqual(prices);
  });

  it('scopes standard users to their own items (RBAC)', async () => {
    const { auth } = await import('@/lib/auth');
    await seedItems(2, ['available', 'available']);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user', canViewAll: false }) as never);
    const res = await route.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/inventory'));
    const body = await res.json();
    for (const item of body.items) expect(item.ownerId).toBe(2);
  });
});

describe('POST /api/inventory', () => {
  it('creates an item with defaults', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 1, role: 'admin' }) as never);
    const res = await route.POST(jsonRequest('http://localhost:3000/api/inventory', 'POST', {
      name: 'Created Item',
      purchaseDate: '2026-04-01',
      purchasePrice: '55.00',
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('Created Item');
    expect(body.status).toBe('available');
    expect(body.purchasePrice).toBe(55);
  });

  it('rejects validation failures with 400 and details', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 1, role: 'admin' }) as never);
    const res = await route.POST(jsonRequest('http://localhost:3000/api/inventory', 'POST', {
      name: '',
      purchaseDate: 'bad-date',
      purchasePrice: -3,
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details?.length).toBeGreaterThan(0);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await route.POST(jsonRequest('http://localhost:3000/api/inventory', 'POST', {
      name: 'x', purchaseDate: '2026-04-01', purchasePrice: 5,
    }));
    expect(res.status).toBe(401);
  });
});