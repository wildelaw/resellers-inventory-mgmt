import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('@/lib/auth', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth')>();
  const { currentSession } = await import('../../helpers/auth-mock');
  return { ...real, auth: async () => currentSession() };
});

import { createTestDb, cleanupTestDb } from '../../setup/db';
import { seedUser } from '../../helpers/seed-data';
import { setSession, makeSession, clearSession } from '../../helpers/auth-mock';
import { invoke } from '../../helpers/api';
import * as inventoryRoute from '@/app/api/inventory/route';
import * as salesRoute from '@/app/api/sales/route';
import * as profileRoute from '@/app/api/profile/route';

const ORIGIN = 'http://localhost:3000';

let dbPath: string;
let userId: number;

beforeAll(async () => {
  dbPath = createTestDb();
  userId = (await seedUser({ email: 'user@example.com', role: 'user' })).id;
  setSession(makeSession({ id: String(userId), role: 'user', canViewAll: false }));
});
afterAll(() => { cleanupTestDb(dbPath); clearSession(); });

describe('Origin/Referer validation on mutations (integration)', () => {
  it('REG-07/08: POST without Origin -> 403 INVALID_ORIGIN', async () => {
    const res = await invoke(inventoryRoute.POST, '/api/inventory', {
      method: 'POST', body: { name: 'X', purchaseDate: '2024-01-01', purchasePrice: '1' },
    });
    expect(res.status).toBe(403);
    expect((res.body as { code: string }).code).toBe('INVALID_ORIGIN');
  });

  it('POST with mismatched Origin -> 403', async () => {
    const res = await invoke(inventoryRoute.POST, '/api/inventory', {
      method: 'POST', origin: 'https://evil.com', body: { name: 'X', purchaseDate: '2024-01-01', purchasePrice: '1' },
    });
    expect(res.status).toBe(403);
  });

  it('POST with matching Origin -> 201', async () => {
    const res = await invoke(inventoryRoute.POST, '/api/inventory', {
      method: 'POST', origin: ORIGIN, body: { name: 'Ok', purchaseDate: '2024-01-01', purchasePrice: '1' },
    });
    expect(res.status).toBe(201);
  });

  it('Referer fallback works when Origin absent', async () => {
    const res = await invoke(salesRoute.POST, '/api/sales', {
      method: 'POST', headers: { referer: 'http://localhost:3000/sales' },
      body: { soldDate: '2024-01-01', soldPrice: '10', platform: 'local' },
    });
    expect(res.status).toBe(201);
  });

  it('GET does not require Origin', async () => {
    const res = await invoke(inventoryRoute.GET, '/api/inventory', { method: 'GET' });
    expect(res.status).toBe(200);
  });

  it('PUT profile without Origin -> 403', async () => {
    const res = await invoke(profileRoute.PUT, '/api/profile', {
      method: 'PUT', body: { type: 'profile', name: 'New' },
    });
    expect(res.status).toBe(403);
  });
});