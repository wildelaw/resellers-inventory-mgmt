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
import * as profileRoute from '@/app/api/profile/route';

let dbPath: string;
let userId: number;

beforeAll(async () => {
  dbPath = createTestDb();
  const u = await seedUser({ email: 'user@example.com', passwordChangedAt: 1000 });
  userId = u.id;
});
afterAll(() => { cleanupTestDb(dbPath); clearSession(); });

describe('session invalidation via passwordChangedAt (functional)', () => {
  it('REG-06: rejects a JWT issued before the last password change (401)', async () => {
    // iat (500) < passwordChangedAt (1000) -> invalid
    setSession(makeSession({ id: String(userId), iat: 500, passwordChangedAt: 1000 }));
    const res = await invoke(profileRoute.GET, '/api/profile', { method: 'GET' });
    expect(res.status).toBe(401);
  });

  it('accepts a JWT issued after the last password change (200)', async () => {
    // iat (2000) >= passwordChangedAt (1000) -> valid
    setSession(makeSession({ id: String(userId), iat: 2000, passwordChangedAt: 1000 }));
    const res = await invoke(profileRoute.GET, '/api/profile', { method: 'GET' });
    expect(res.status).toBe(200);
  });

  it('rejects an inactive account session (401)', async () => {
    setSession(makeSession({ id: String(userId), iat: 2000, passwordChangedAt: 1000, isActive: false }));
    const res = await invoke(profileRoute.GET, '/api/profile', { method: 'GET' });
    expect(res.status).toBe(401);
  });

  it('rejects when there is no session (401)', async () => {
    setSession(null);
    const res = await invoke(profileRoute.GET, '/api/profile', { method: 'GET' });
    expect(res.status).toBe(401);
  });
});