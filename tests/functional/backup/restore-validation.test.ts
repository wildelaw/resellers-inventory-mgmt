import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { users, items, sales, photos, mileage, appConfig } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { restoreBackup, buildBackup } from '@/lib/backup';
import { createTestDb, type TestDbHandle } from '../../setup/db';

let handle: TestDbHandle;

function now() { return Date.now(); }

describe('backup/restore validation', () => {
  beforeAll(() => {
    handle = createTestDb();
  });

  afterAll(() => handle.cleanup());

  it('rejects invalid backup version', async () => {
    await expect(restoreBackup({ version: 1, tables: {} })).rejects.toThrow();
  });

  it('rejects invalid user role', async () => {
    const t = now();
    const bad = {
      version: 2,
      exportedAt: new Date().toISOString(),
      tables: {
        users: [{
          id: 1, email: 'a@b.com', passwordHash: 'x', name: 'A',
          role: 'power_user', // invalid
          canViewAll: false, isActive: true, passwordChangedAt: 0,
          createdAt: t, updatedAt: t,
        }],
        items: [], sales: [], photos: [], mileage: [], app_config: [],
      },
    };
    await expect(restoreBackup(bad)).rejects.toThrow();
  });

  it('rejects invalid sale platform', async () => {
    const t = now();
    const bad = {
      version: 2,
      exportedAt: new Date().toISOString(),
      tables: {
        users: [], items: [],
        sales: [{
          id: 1, itemId: null, soldDate: t, soldPrice: 50,
          platform: 'walmart', // invalid
          soldBy: 1, createdAt: t, refundType: 'none',
        }],
        photos: [], mileage: [], app_config: [],
      },
    };
    await expect(restoreBackup(bad)).rejects.toThrow();
  });

  it('restores a valid backup', async () => {
    const t = now();
    const valid = {
      version: 2 as const,
      exportedAt: new Date().toISOString(),
      tables: {
        app_config: [{
          id: 1, companyName: 'Test', companyTagline: '', salesTaxRate: 0.0825,
          setupComplete: true, updatedAt: t,
        }],
        users: [{
          id: 1, email: 'admin@test.com', passwordHash: 'x', name: 'Admin',
          role: 'admin', canViewAll: true, isActive: true, passwordChangedAt: 0,
          createdAt: t, updatedAt: t,
        }],
        items: [{
          id: 1, name: 'Test', description: null, purchaseDate: t, purchasePrice: 10,
          purchaseLocation: null, category: null, status: 'available', notes: null,
          removalDate: null, metadata: null, ownerId: 1, createdAt: t, updatedAt: t,
        }],
        sales: [], photos: [], mileage: [],
      },
    };
    const result = await restoreBackup(valid);
    expect(result.counts.users).toBe(1);
    expect(result.counts.items).toBe(1);
    const user = db.select().from(users).where(eq(users.id, 1)).get();
    expect(user?.email).toBe('admin@test.com');
  });

  it('buildBackup + restore round-trips data', async () => {
    const backup = buildBackup();
    expect(backup.version).toBe(2);
    expect(backup.tables.users.length).toBeGreaterThan(0);
    expect(backup.tables.items.length).toBeGreaterThan(0);
    // restore should succeed (the data is already valid)
    const result = await restoreBackup(backup);
    expect(result.counts.users).toBe(backup.tables.users.length);
  });
});