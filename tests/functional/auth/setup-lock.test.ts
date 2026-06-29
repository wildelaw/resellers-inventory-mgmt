import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('@/lib/auth', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth')>();
  const { currentSession } = await import('../../helpers/auth-mock');
  return { ...real, auth: async () => currentSession() };
});

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { createTestDb, cleanupTestDb } from '../../setup/db';
import { setSession, makeSession, clearSession } from '../../helpers/auth-mock';
import { invoke } from '../../helpers/api';
import * as setupRoute from '@/app/api/setup/route';
import * as unlockRoute from '@/app/api/admin/setup-unlock/route';

let dbPath: string;

beforeAll(() => { dbPath = createTestDb(); });
afterAll(() => { cleanupTestDb(dbPath); clearSession(); });

describe('setup lock (functional)', () => {
  it('REG-16: creates the first admin and locks setup', async () => {
    const res = await invoke(setupRoute.POST, '/api/setup', {
      method: 'POST', origin: 'http://localhost:3000',
      body: { name: 'Admin', email: 'admin@example.com', password: 'AdminP@ss1' },
    });
    expect(res.status).toBe(201);
    const cfg = db.select().from(appConfig).where(eq(appConfig.id, 1)).all()[0];
    expect(cfg?.setupComplete).toBe(1);
  });

  it('GET /api/setup reports needsSetup false after lock', async () => {
    const res = await invoke(setupRoute.GET, '/api/setup', { method: 'GET' });
    expect(res.status).toBe(200);
    expect((res.body as { needsSetup: boolean }).needsSetup).toBe(false);
  });

  it('second POST /api/setup is forbidden (403)', async () => {
    const res = await invoke(setupRoute.POST, '/api/setup', {
      method: 'POST', origin: 'http://localhost:3000',
      body: { name: 'X', email: 'x@x.com', password: 'Xxxxx@1' },
    });
    expect(res.status).toBe(403);
  });

  it('POST /api/setup without Origin is 403 (CSRF)', async () => {
    const res = await invoke(setupRoute.POST, '/api/setup', {
      method: 'POST',
      body: { name: 'Y', email: 'y@y.com', password: 'Yyyyy@1' },
    });
    expect(res.status).toBe(403);
  });

  it('admin setup-unlock re-opens setup (setupComplete -> 0)', async () => {
    setSession(makeSession({ id: '1', role: 'admin', canViewAll: true }));
    const res = await invoke(unlockRoute.POST, '/api/admin/setup-unlock', {
      method: 'POST', origin: 'http://localhost:3000',
    });
    expect(res.status).toBe(200);
    const cfg = db.select().from(appConfig).where(eq(appConfig.id, 1)).all()[0];
    expect(cfg?.setupComplete).toBe(0);
  });

  it('non-admin cannot unlock (403)', async () => {
    setSession(makeSession({ id: '1', role: 'user', canViewAll: false }));
    const res = await invoke(unlockRoute.POST, '/api/admin/setup-unlock', {
      method: 'POST', origin: 'http://localhost:3000',
    });
    expect(res.status).toBe(403);
  });
});