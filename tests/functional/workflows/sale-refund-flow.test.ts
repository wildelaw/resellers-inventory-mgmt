import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, cleanupTestDb, getTestDb, getTestSqlite } from '../../setup/db';
import { items, users, sales } from '@/lib/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

describe('sale-refund flow', () => {
  beforeEach(() => createTestDb());
  afterEach(() => cleanupTestDb());

  async function setup() {
    const db = getTestDb();
    const sqlite = getTestSqlite();
    const now = Math.floor(Date.now() / 1000);
    const hash = await bcrypt.hash('T@ss1word', 10);
    const u = db.insert(users).values({ email: 't@t.com', passwordHash: hash, name: 'T' }).returning();
    const item = db.insert(items).values({ name: 'Item', purchaseDate: now, purchasePrice: 20, ownerId: u[0].id }).returning();
    return { db, sqlite, now, userId: u[0].id, itemId: item[0].id };
  }

  it('creates sale and updates item status to sold', async () => {
    const { db, sqlite, now, userId, itemId } = await setup();
    sqlite.transaction(() => {
      db.insert(sales).values({ itemId, soldDate: now, soldPrice: 50, platform: 'ebay', soldBy: userId }).run();
      db.update(items).set({ status: 'sold', removalDate: now }).where(eq(items.id, itemId)).run();
    })();
    const item = db.query.items.findFirst({ where: eq(items.id, itemId) });
    expect(item!.status).toBe('sold');
  });

  it('refund_with_return sets item to returned', async () => {
    const { db, sqlite, now, userId, itemId } = await setup();
    const sale = db.insert(sales).values({ itemId, soldDate: now, soldPrice: 50, platform: 'ebay', soldBy: userId }).returning();
    db.update(items).set({ status: 'sold', removalDate: now }).where(eq(items.id, itemId)).run();

    sqlite.transaction(() => {
      db.update(sales).set({ refundAmount: 50, refundType: 'refund_with_return' }).where(eq(sales.id, sale[0].id)).run();
      db.update(items).set({ status: 'returned', removalDate: null }).where(eq(items.id, itemId)).run();
    })();

    const item = db.query.items.findFirst({ where: eq(items.id, itemId) });
    expect(item!.status).toBe('returned');
    expect(item!.removalDate).toBeNull();
  });

  it('refund_no_return keeps item sold', async () => {
    const { db, sqlite, now, userId, itemId } = await setup();
    const sale = db.insert(sales).values({ itemId, soldDate: now, soldPrice: 50, platform: 'ebay', soldBy: userId }).returning();
    db.update(items).set({ status: 'sold', removalDate: now }).where(eq(items.id, itemId)).run();

    db.update(sales).set({ refundAmount: 25, refundType: 'refund_no_return' }).where(eq(sales.id, sale[0].id)).run();

    const item = db.query.items.findFirst({ where: eq(items.id, itemId) });
    expect(item!.status).toBe('sold');
  });

  it('deleting sale reverts item to available', async () => {
    const { db, sqlite, now, userId, itemId } = await setup();
    const sale = db.insert(sales).values({ itemId, soldDate: now, soldPrice: 50, platform: 'ebay', soldBy: userId }).returning();
    db.update(items).set({ status: 'sold', removalDate: now }).where(eq(items.id, itemId)).run();

    sqlite.transaction(() => {
      db.delete(sales).where(eq(sales.id, sale[0].id)).run();
      db.update(items).set({ status: 'available', removalDate: null }).where(eq(items.id, itemId)).run();
    })();

    const item = db.query.items.findFirst({ where: eq(items.id, itemId) });
    expect(item!.status).toBe('available');
  });
});
