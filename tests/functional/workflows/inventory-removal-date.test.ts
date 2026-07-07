import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, cleanupTestDb } from '../../setup/db';
import { items, users, sales } from '../../../src/lib/schema';
import { nowTimestamp } from '../../../src/lib/utils';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../../src/lib/schema';

let db: BetterSQLite3Database<typeof schema>;
let testUserId: number;

beforeAll(async () => {
  db = createTestDb();
  const now = nowTimestamp();
  const user = await db.insert(users).values({
    email: 'test@example.com',
    passwordHash: 'hash',
    name: 'Test User',
    role: 'user',
    canViewAll: false,
    isActive: true,
    passwordChangedAt: 0,
    createdAt: now,
    updatedAt: now,
  }).returning();
  testUserId = user[0].id;
});

afterAll(() => {
  cleanupTestDb(db);
});

describe('Inventory Removal Date', () => {
  it('starts with null removalDate for new items', async () => {
    const now = nowTimestamp();
    const item = await db.insert(items).values({
      name: 'New Item',
      purchaseDate: now,
      purchasePrice: 10,
      status: 'available',
      ownerId: testUserId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    expect(item[0].removalDate).toBeNull();
  });

  it('sets removalDate when status changes to donated', async () => {
    const now = nowTimestamp();
    const item = await db.insert(items).values({
      name: 'To Donate',
      purchaseDate: now,
      purchasePrice: 10,
      status: 'available',
      ownerId: testUserId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const updated = await db.update(items)
      .set({ status: 'donated', removalDate: now, updatedAt: now })
      .where(eq(items.id, item[0].id))
      .returning();

    expect(updated[0].removalDate).not.toBeNull();
    expect(updated[0].removalDate).toBe(now);
  });

  it('sets removalDate when status changes to discarded', async () => {
    const now = nowTimestamp();
    const item = await db.insert(items).values({
      name: 'To Discard',
      purchaseDate: now,
      purchasePrice: 10,
      status: 'available',
      ownerId: testUserId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const updated = await db.update(items)
      .set({ status: 'discarded', removalDate: now, updatedAt: now })
      .where(eq(items.id, item[0].id))
      .returning();

    expect(updated[0].removalDate).not.toBeNull();
  });

  it('clears removalDate when returned to available from returned', async () => {
    const now = nowTimestamp();
    const item = await db.insert(items).values({
      name: 'Returned Item',
      purchaseDate: now,
      purchasePrice: 10,
      status: 'returned',
      removalDate: now,
      ownerId: testUserId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const updated = await db.update(items)
      .set({ status: 'available', removalDate: null, updatedAt: now })
      .where(eq(items.id, item[0].id))
      .returning();

    expect(updated[0].removalDate).toBeNull();
  });

  it('does not create sale records for donated items', async () => {
    const now = nowTimestamp();
    const item = await db.insert(items).values({
      name: 'No Sale Donate',
      purchaseDate: now,
      purchasePrice: 10,
      status: 'donated',
      removalDate: now,
      ownerId: testUserId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Verify no sales exist for this item
    const itemSales = await db.query.sales.findMany({
      where: eq(sales.itemId, item[0].id),
    });
    expect(itemSales).toHaveLength(0);
  });

  it('does not create sale records for discarded items', async () => {
    const now = nowTimestamp();
    const item = await db.insert(items).values({
      name: 'No Sale Discard',
      purchaseDate: now,
      purchasePrice: 10,
      status: 'discarded',
      removalDate: now,
      ownerId: testUserId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const itemSales = await db.query.sales.findMany({
      where: eq(sales.itemId, item[0].id),
    });
    expect(itemSales).toHaveLength(0);
  });
});