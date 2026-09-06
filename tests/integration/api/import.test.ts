import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupTestDb } from '../../setup/db';
import { mockSession } from '../../setup/session';
import { jsonRequest } from '../../setup/request';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
let route: typeof import('@/app/api/import/route');

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  route = await import('@/app/api/import/route');

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

function post(body: unknown) {
  return route.POST(jsonRequest('http://localhost:3000/api/import', 'POST', body));
}

const INV_CSV = 'name,purchase price,purchase date\nVintage Lamp,25.50,2026-01-10\nRetro Radio,40,01/15/2026\nBad Price Row,\n,19.99';
const SALES_CSV = 'item name,sold date,sold price,platform\nNamed Match Widget,2026-02-01,60.00,ebay';
const FUZZY_CSV = 'item name,sold date,sold price,platform\nFuzzy Match Widget,2026-02-01,60.00,ebay';
const MILEAGE_CSV = 'date,miles,from,destination\n2026-02-05,12.4,Home,Estate Sale\n2026-02-06,8,Garage,Post Office';

describe('POST /api/import (inventory)', () => {
  it('imports inventory rows and reports per-row errors', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await post({ type: 'inventory', csvData: INV_CSV, columnMappings: {} });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(2);
    // 2 route-level skips + 2 CSV parse errors (short rows)
    expect(body.errors.length).toBeGreaterThanOrEqual(2);
    expect(body.errors.some((e: string) => e.includes('invalid purchase price'))).toBe(true);

    const { items } = await import('@/lib/schema');
    const [lamp] = await db.select().from(items).where(eq(items.name, 'Vintage Lamp'));
    expect(lamp.purchasePrice).toBe(25.5);
    expect(lamp.status).toBe('available');
    expect(lamp.ownerId).toBe(2);
    // MM/DD/YYYY parsed correctly
    const [radio] = await db.select().from(items).where(eq(items.name, 'Retro Radio'));
    expect(radio.purchaseDate.getMonth()).toBe(0); // January
  });

  it('rejects imports without a name column', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await post({ type: 'inventory', csvData: 'foo,bar\n1,2', columnMappings: {} });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/import (sales)', () => {
  it('matches a sale to an existing item by exact name and marks it sold', async () => {
    const { auth } = await import('@/lib/auth');
    const { items } = await import('@/lib/schema');
    const [item] = await db.insert(items).values({
      name: 'Named Match Widget', purchaseDate: new Date('2026-01-10'), purchasePrice: 25.5,
      status: 'available', ownerId: 2, createdAt: new Date(), updatedAt: new Date(),
    }).returning();

    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await post({ type: 'sales', csvData: SALES_CSV, columnMappings: {} });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(1);

    const [after] = await db.select().from(items).where(eq(items.id, item.id));
    expect(after.status).toBe('sold');
    expect(after.removalDate).not.toBeNull();
  });

  it('fuzzy-matches by name/date/price when no exact match exists', async () => {
    const { auth } = await import('@/lib/auth');
    const { items } = await import('@/lib/schema');
    const [item] = await db.insert(items).values({
      name: 'Fuzzy Match Widget', purchaseDate: new Date('2026-02-01'), purchasePrice: 60,
      status: 'available', ownerId: 2, createdAt: new Date(), updatedAt: new Date(),
    }).returning();

    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await post({ type: 'sales', csvData: FUZZY_CSV, columnMappings: {} });
    const body = await res.json();
    expect(body.success).toBe(1);

    const [after] = await db.select().from(items).where(eq(items.id, item.id));
    expect(after.status).toBe('sold');
  });

  it('creates a placeholder sold item when nothing matches', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await post({
      type: 'sales',
      csvData: 'item name,sold date,sold price\nMystery Widget,2026-03-01,15.00',
      columnMappings: {},
    });
    const body = await res.json();
    expect(body.success).toBe(1);

    const { items } = await import('@/lib/schema');
    const [created] = await db.select().from(items).where(eq(items.name, 'Mystery Widget'));
    expect(created.status).toBe('sold');
    expect(created.purchasePrice).toBe(0);
  });

  it('rejects a sales CSV missing required columns', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await post({ type: 'sales', csvData: 'foo\n1', columnMappings: {} });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/import (mileage)', () => {
  it('imports mileage rows', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await post({ type: 'mileage', csvData: MILEAGE_CSV, columnMappings: {} });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(2);

    const { mileage } = await import('@/lib/schema');
    const rows = await db.select().from(mileage).where(eq(mileage.ownerId, 2));
    const estate = rows.find((m) => m.toLocation === 'Estate Sale');
    expect(estate?.miles).toBe(12.4);
  });

  it('rejects rows with zero or negative miles', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await post({ type: 'mileage', csvData: 'date,miles\n2026-02-05,0', columnMappings: {} });
    const body = await res.json();
    expect(body.success).toBe(0);
    expect(body.errors[0]).toContain('invalid miles');
  });
});

describe('POST /api/import (validation/auth)', () => {
  it('rejects unknown import types with 400', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await post({ type: 'nonsense', csvData: 'a\n1', columnMappings: {} });
    expect(res.status).toBe(400);
  });

  it('rejects an empty CSV with 400', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 2, role: 'user' }) as never);
    const res = await post({ type: 'inventory', csvData: 'name\n', columnMappings: {} });
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await post({ type: 'inventory', csvData: INV_CSV, columnMappings: {} });
    expect(res.status).toBe(401);
  });
});