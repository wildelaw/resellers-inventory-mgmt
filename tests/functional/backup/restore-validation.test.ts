import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('@/lib/auth', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth')>();
  const { currentSession } = await import('../../helpers/auth-mock');
  return { ...real, auth: async () => currentSession() };
});

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, items } from '@/lib/schema';
import { createTestDb, cleanupTestDb } from '../../setup/db';
import { seedUser, seedItem } from '../../helpers/seed-data';
import { setSession, makeSession, clearSession } from '../../helpers/auth-mock';
import { invoke } from '../../helpers/api';
import * as restoreRoute from '@/app/api/admin/restore/route';
import { validateBackup, buildBackup, BACKUP_VERSION } from '@/lib/backup';

let dbPath: string;

beforeAll(async () => {
  dbPath = createTestDb();
  const u = await seedUser({ email: 'admin@example.com', role: 'admin' });
  seedItem({ ownerId: u.id, name: 'Thing', purchasePrice: 5 });
  setSession(makeSession({ id: String(u.id), role: 'admin', canViewAll: true }));
});
afterAll(() => { cleanupTestDb(dbPath); clearSession(); });

describe('backup restore validation (functional)', () => {
  it('REG-15: invalid backup (bad role) is rejected with no DB changes', async () => {
    const payload = await buildBackup();
    (payload.tables.users[0] as { role: string }).role = 'power_user'; // invalid role
    const before = db.select().from(users).all().length;
    const res = await invoke(restoreRoute.POST, '/api/admin/restore', {
      method: 'POST', origin: 'http://localhost:3000', body: payload,
    });
    expect(res.status).toBe(400);
    // No DB changes occurred.
    expect(db.select().from(users).all().length).toBe(before);
  });

  it('invalid backup (bad enum status) is rejected', () => {
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      tables: {
        users: [], items: [{
          id: 1, name: 'X', description: null, purchaseDate: 1, purchasePrice: 1,
          purchaseLocation: null, category: null, status: 'flying', notes: null,
          removalDate: null, metadata: null, ownerId: 1, createdAt: 1, updatedAt: 1,
        }],
        sales: [], photos: [], mileage: [], app_config: [],
      },
    };
    const errors = validateBackup(payload);
    expect(errors).not.toBeNull();
    expect(errors?.some((e) => e.table === 'items')).toBe(true);
  });

  it('valid backup restores correctly', async () => {
    const payload = await buildBackup();
    const res = await invoke(restoreRoute.POST, '/api/admin/restore', {
      method: 'POST', origin: 'http://localhost:3000', body: payload,
    });
    expect(res.status).toBe(200);
    // The admin user and item are restored.
    expect(db.select().from(users).where(eq(users.email, 'admin@example.com')).all().length).toBe(1);
    expect(db.select().from(items).all().length).toBeGreaterThanOrEqual(1);
  });

  it('rejects wrong backup version', () => {
    const payload = { version: 999, exportedAt: '', tables: { users: [], items: [], sales: [], photos: [], mileage: [], app_config: [] } };
    expect(validateBackup(payload)).not.toBeNull();
  });
});