import { describe, it, expect, beforeAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupTestDb } from '../../setup/db';
import { buildBackup, restoreBackup } from '@/lib/backup';

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
});

async function seedPrimaryData() {
  const { users, items, sales, mileage } = await import('@/lib/schema');
  const [user] = await db.insert(users).values({
    email: 'backup@t.test',
    passwordHash: 'x',
    name: 'Backup User',
    role: 'admin',
    canViewAll: true,
    isActive: true,
    passwordChangedAt: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  }).returning();

  const [item] = await db.insert(items).values({
    name: 'Backup Item',
    purchaseDate: new Date('2026-01-05'),
    purchasePrice: 25,
    status: 'sold' as never,
    ownerId: user.id,
    removalDate: new Date('2026-02-01'),
    createdAt: new Date('2026-01-05'),
    updatedAt: new Date('2026-02-01'),
  }).returning();

  const [sale] = await db.insert(sales).values({
    itemId: item.id,
    soldDate: new Date('2026-02-01'),
    soldPrice: 80,
    platform: 'ebay' as never,
    soldBy: user.id,
    createdAt: new Date('2026-02-01'),
  }).returning();

  const [trip] = await db.insert(mileage).values({
    date: new Date('2026-01-10'),
    miles: 14.2,
    fromLocation: 'Home',
    toLocation: 'Estate Sale',
    ownerId: user.id,
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-01-10'),
  }).returning();

  return { user, item, sale, trip };
}

describe('backup restore validation (REG-15)', () => {
  it('valid backup restores all tables correctly', async () => {
    const { user, item, sale, trip } = await seedPrimaryData();
    const backup = await buildBackup();
    expect(backup.version).toBe(2);

    // Wipe everything, then restore
    const { users, items, sales, mileage, photos, appConfig } = await import('@/lib/schema');
    db.transaction((tx) => {
      tx.delete(photos).run();
      tx.delete(sales).run();
      tx.delete(mileage).run();
      tx.delete(items).run();
      tx.delete(users).run();
      return null;
    });

    const result = await restoreBackup(backup);
    expect(result.restored.users).toBe(1);
    expect(result.restored.items).toBe(1);
    expect(result.restored.sales).toBe(1);
    expect(result.restored.mileage).toBe(1);

    const restoredUsers = await db.select().from(users);
    expect(restoredUsers).toHaveLength(1);
    expect(restoredUsers[0].email).toBe('backup@t.test');

    const restoredItems = await db.select().from(items);
    expect(restoredItems[0].id).toBe(item.id);
    expect(restoredItems[0].name).toBe('Backup Item');
    expect(restoredItems[0].removalDate).not.toBeNull();

    const restoredSales = await db.select().from(sales);
    expect(restoredSales[0].id).toBe(sale.id);
    expect(restoredSales[0].soldPrice).toBe(80);

    const restoredTrips = await db.select().from(mileage);
    expect(restoredTrips[0].id).toBe(trip.id);
    expect(restoredTrips[0].miles).toBeCloseTo(14.2);

    void user;
  });

  it('rejects invalid roles (v1 power_user is not a v2 role)', async () => {
    const backup = await buildBackup();
    backup.tables.users[0].role = 'power_user' as never;

    const before = await db.select().from(await import('@/lib/schema').then((m) => m.users));
    await expect(restoreBackup(backup)).rejects.toThrow();
    const after = await db.select().from(await import('@/lib/schema').then((m) => m.users));
    expect(after).toEqual(before);
  });

  it('rejects invalid enum values in items', async () => {
    const backup = await buildBackup();
    backup.tables.items[0].status = 'stolen' as never;
    await expect(restoreBackup(backup)).rejects.toThrow();
  });

  it('rejects invalid platforms in sales', async () => {
    const backup = await buildBackup();
    backup.tables.sales[0].platform = 'craigslist' as never;
    await expect(restoreBackup(backup)).rejects.toThrow();
  });

  it('rejects referentially broken backups (item with missing owner)', async () => {
    const backup = await buildBackup();
    backup.tables.items[0].ownerId = 99999;
    await expect(restoreBackup(backup)).rejects.toThrow();
  });

  it('rejects sales referencing missing items', async () => {
    const backup = await buildBackup();
    backup.tables.sales[0].itemId = 99999;
    await expect(restoreBackup(backup)).rejects.toThrow();
  });

  it('is atomic: a failed restore leaves the database untouched', async () => {
    const { users, items, sales, mileage } = await import('@/lib/schema');
    const before = {
      users: await db.select().from(users),
      items: await db.select().from(items),
      sales: await db.select().from(sales),
      mileage: await db.select().from(mileage),
    };

    const backup = await buildBackup();
    // Corrupt one sale AFTER a structurally valid build — validation must catch
    // it and the transaction must not apply partial changes.
    backup.tables.mileage[0].ownerId = 424242;
    await expect(restoreBackup(backup)).rejects.toThrow();

    const after = {
      users: await db.select().from(users),
      items: await db.select().from(items),
      sales: await db.select().from(sales),
      mileage: await db.select().from(mileage),
    };
    expect(after.users).toHaveLength(before.users.length);
    expect(after.items).toHaveLength(before.items.length);
    expect(after.sales).toHaveLength(before.sales.length);
    expect(after.mileage).toHaveLength(before.mileage.length);
    expect(after.mileage[0].id).toBe(before.mileage[0].id);
  });

  it('restores app_config including setupComplete', async () => {
    const { appConfig } = await import('@/lib/schema');
    const [config] = await db.select().from(appConfig).limit(1);
    expect(config).toBeDefined();

    const backup = await buildBackup();
    await db.delete(appConfig).where(eq(appConfig.id, config?.id ?? 1));
    await restoreBackup(backup);
    const [restored] = await db.select().from(appConfig).limit(1);
    expect(restored.id).toBe(1);
    expect(restored.setupComplete).toBe(config.setupComplete);
  });
});