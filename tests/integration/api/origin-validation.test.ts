import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { setupTestDb } from '../../setup/db';
import { mockSession } from '../../setup/session';
import { jsonRequest } from '../../setup/request';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

// REG-07/08 — mutation requests are protected by Origin/Referer validation:
//  - missing both → 403
//  - mismatched origin → 403 INVALID_ORIGIN
//  - matching origin → passes

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
let route: typeof import('@/app/api/inventory/route');

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  route = await import('@/app/api/inventory/route');

  const { users } = await import('@/lib/schema');
  await db.insert(users).values([
    { id: 1, email: 'alice@test.com', passwordHash: 'x', name: 'Alice', role: 'admin', canViewAll: true, isActive: true, passwordChangedAt: 0, createdAt: new Date(), updatedAt: new Date() },
  ]);
});

beforeEach(async () => {
  const { auth } = await import('@/lib/auth');
  vi.mocked(auth).mockReset();
  vi.mocked(auth).mockResolvedValue(mockSession({ id: 1, role: 'admin' }) as never);
});

describe('Origin/Referer validation on mutations', () => {
  it('rejects a POST with no Origin or Referer header (REG-07)', async () => {
    const res = await route.POST(jsonRequest('http://localhost:3000/api/inventory', 'POST', {
      name: 'Stealth Item', purchaseDate: '2026-04-01', purchasePrice: 5,
    }, { origin: '' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('INVALID_ORIGIN');
  });

  it('rejects a POST from a mismatched origin (REG-08)', async () => {
    const res = await route.POST(jsonRequest('http://localhost:3000/api/inventory', 'POST', {
      name: 'Evil Item', purchaseDate: '2026-04-01', purchasePrice: 5,
    }, { origin: 'http://evil.example.com' }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('INVALID_ORIGIN');
  });

  it('allows a POST with a matching origin', async () => {
    const res = await route.POST(jsonRequest('http://localhost:3000/api/inventory', 'POST', {
      name: 'Legit Item', purchaseDate: '2026-04-01', purchasePrice: 5,
    }));
    expect(res.status).toBe(201);
  });

  it('falls back to the Referer header when Origin is absent', async () => {
    const good = await route.POST(jsonRequest('http://localhost:3000/api/inventory', 'POST', {
      name: 'Referer Good', purchaseDate: '2026-04-01', purchasePrice: 5,
    }, { origin: '', referer: 'http://localhost:3000/inventory/new' }));
    expect(good.status).toBe(201);

    const bad = await route.POST(jsonRequest('http://localhost:3000/api/inventory', 'POST', {
      name: 'Referer Evil', purchaseDate: '2026-04-01', purchasePrice: 5,
    }, { origin: '', referer: 'http://evil.example.com/form' }));
    expect(bad.status).toBe(403);
  });

  it('does not apply origin validation to GET requests', async () => {
    const res = await route.GET(new (await import('next/server')).NextRequest('http://localhost:3000/api/inventory'));
    expect(res.status).toBe(200);
  });

  it('accepts the AUTH_URL origin as trusted when configured', async () => {
    process.env.AUTH_URL = 'https://inventory.example.com';
    try {
      const good = await route.POST(jsonRequest('http://localhost:3000/api/inventory', 'POST', {
        name: 'Proxy Item', purchaseDate: '2026-04-01', purchasePrice: 5,
      }, { origin: 'https://inventory.example.com', host: 'inventory.example.com' }));
      expect(good.status).toBe(201);

      const bad = await route.POST(jsonRequest('http://localhost:3000/api/inventory', 'POST', {
        name: 'Proxy Evil', purchaseDate: '2026-04-01', purchasePrice: 5,
      }, { origin: 'https://evil.example.com', host: 'inventory.example.com' }));
      expect(bad.status).toBe(403);
    } finally {
      delete process.env.AUTH_URL;
    }
  });
});