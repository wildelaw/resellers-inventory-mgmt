import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { setupTestDb } from '../../setup/db';
import { mockSession } from '../../setup/session';
import { jsonRequest, paramsCtx } from '../../setup/request';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

// REG-09/10/11 — the RBAC matrix across routes:
//  - standard user: own data only
//  - canViewAll user: read everything, edit own only
//  - admin: read + edit everything

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
let inventoryRoute: typeof import('@/app/api/inventory/route');
let inventoryIdRoute: typeof import('@/app/api/inventory/[id]/route');
let usersRoute: typeof import('@/app/api/admin/users/route');

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  inventoryRoute = await import('@/app/api/inventory/route');
  inventoryIdRoute = await import('@/app/api/inventory/[id]/route');
  usersRoute = await import('@/app/api/admin/users/route');

  const { users } = await import('@/lib/schema');
  await db.insert(users).values([
    { id: 1, email: 'admin@test.com', passwordHash: 'x', name: 'Admin', role: 'admin', canViewAll: true, isActive: true, passwordChangedAt: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, email: 'bob@test.com', passwordHash: 'x', name: 'Bob', role: 'user', canViewAll: false, isActive: true, passwordChangedAt: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 3, email: 'carol@test.com', passwordHash: 'x', name: 'Carol', role: 'user', canViewAll: true, isActive: true, passwordChangedAt: 0, createdAt: new Date(), updatedAt: new Date() },
  ]);
});

beforeEach(async () => {
  const { auth } = await import('@/lib/auth');
  vi.mocked(auth).mockReset();
});

let counter = 0;
async function seedItem(ownerId: number): Promise<number> {
  const { items } = await import('@/lib/schema');
  counter++;
  const [row] = await db.insert(items).values({
    name: `RBAC Item ${counter}`,
    purchaseDate: new Date('2026-01-01'),
    purchasePrice: 10,
    status: 'available' as never,
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return row.id;
}

function sessionFor(id: number, role: string, canViewAll: boolean) {
  return mockSession({ id, role, canViewAll } as never) as never;
}

describe('REG-09: standard users see only their own data', () => {
  it('cannot list or fetch another users item', async () => {
    const { auth } = await import('@/lib/auth');
    const bobsId = await seedItem(2);
    const adminsId = await seedItem(1);
    vi.mocked(auth).mockResolvedValue(sessionFor(2, 'user', false));

    const list = await inventoryRoute.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/inventory'));
    const listBody = await list.json();
    expect(listBody.items.some((i: { id: number }) => i.id === adminsId)).toBe(false);
    expect(listBody.items.some((i: { id: number }) => i.id === bobsId)).toBe(true);

    const detail = await inventoryIdRoute.GET(jsonRequest(`http://localhost:3000/api/inventory/${adminsId}`, 'GET'), paramsCtx({ id: String(adminsId) }));
    expect([403, 404]).toContain(detail.status);
  });
});

describe('REG-10: canViewAll users read everything but edit only their own', () => {
  it('reads another users item but gets 403 on edit and delete', async () => {
    const { auth } = await import('@/lib/auth');
    const bobsId = await seedItem(2);
    vi.mocked(auth).mockResolvedValue(sessionFor(3, 'user', true));

    const get = await inventoryIdRoute.GET(jsonRequest(`http://localhost:3000/api/inventory/${bobsId}`, 'GET'), paramsCtx({ id: String(bobsId) }));
    expect(get.status).toBe(200);

    const put = await inventoryIdRoute.PUT(jsonRequest(`http://localhost:3000/api/inventory/${bobsId}`, 'PUT', { name: 'Hijack' }), paramsCtx({ id: String(bobsId) }));
    expect(put.status).toBe(403);

    const del = await inventoryIdRoute.DELETE(jsonRequest(`http://localhost:3000/api/inventory/${bobsId}`, 'DELETE'), paramsCtx({ id: String(bobsId) }));
    expect(del.status).toBe(403);
  });
});

describe('REG-11: admins can read and edit any users data', () => {
  it('edits and deletes another users item', async () => {
    const { auth } = await import('@/lib/auth');
    const bobsId = await seedItem(2);
    vi.mocked(auth).mockResolvedValue(sessionFor(1, 'admin', true));

    const put = await inventoryIdRoute.PUT(jsonRequest(`http://localhost:3000/api/inventory/${bobsId}`, 'PUT', { notes: 'admin note' }), paramsCtx({ id: String(bobsId) }));
    expect(put.status).toBe(200);

    const del = await inventoryIdRoute.DELETE(jsonRequest(`http://localhost:3000/api/inventory/${bobsId}`, 'DELETE'), paramsCtx({ id: String(bobsId) }));
    expect(del.status).toBe(200);
  });
});

describe('user management is admin-only', () => {
  it('forbids standard and canViewAll users from the admin user list', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(sessionFor(2, 'user', false));
    const asUser = await usersRoute.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/admin/users'));
    expect(asUser.status).toBe(403);

    vi.mocked(auth).mockResolvedValue(sessionFor(3, 'user', true));
    const asCanViewAll = await usersRoute.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/admin/users'));
    expect(asCanViewAll.status).toBe(403);

    vi.mocked(auth).mockResolvedValue(sessionFor(1, 'admin', true));
    const asAdmin = await usersRoute.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/admin/users'));
    expect(asAdmin.status).toBe(200);
  });
});