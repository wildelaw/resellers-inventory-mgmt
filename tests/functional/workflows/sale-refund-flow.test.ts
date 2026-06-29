import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { items, users, sales } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDbHandle } from '../../setup/db';

let handle: TestDbHandle;
let ownerId: number;

function now() { return Date.now(); }

function createItem(overrides: Partial<typeof items.$inferInsert> = {}) {
  const t = now();
  return db.insert(items).values({
    name: 'Item',
    purchaseDate: t,
    purchasePrice: 25,
    status: 'available',
    ownerId,
    createdAt: t,
    updatedAt: t,
    ...overrides,
  }).returning().get();
}

function createSale(itemId: number, overrides: Partial<typeof sales.$inferInsert> = {}) {
  const t = now();
  return db.insert(sales).values({
    itemId,
    soldDate: t,
    soldPrice: 50,
    platform: 'ebay',
    soldBy: ownerId,
    createdAt: t,
    ...overrides,
  }).returning().get();
}

describe('sale/refund flow (functional)', () => {
  beforeAll(() => {
    handle = createTestDb();
    const t = now();
    const user = db.insert(users).values({
      email: 'seller@test.com',
      passwordHash: '$2a$10$dummy',
      name: 'Seller',
      role: 'user',
      createdAt: t,
      updatedAt: t,
    }).returning().get();
    ownerId = user.id;
  });

  afterAll(() => handle.cleanup());

  it('creating a sale updates item status to sold', () => {
    const item = createItem();
    db.transaction((tx) => {
      tx.insert(sales).values({
        itemId: item.id, soldDate: now(), soldPrice: 50, platform: 'ebay',
        soldBy: ownerId, createdAt: now(),
      }).run();
      tx.update(items).set({ status: 'sold', removalDate: now(), updatedAt: now() })
        .where(eq(items.id, item.id)).run();
    });
    const after = db.select().from(items).where(eq(items.id, item.id)).get();
    expect(after?.status).toBe('sold');
    expect(after?.removalDate).not.toBeNull();
  });

  it('refund_with_return sets item status to returned and clears removalDate', () => {
    const item = createItem({ status: 'sold', removalDate: now() });
    const sale = createSale(item.id);
    db.transaction((tx) => {
      tx.update(sales).set({
        refundAmount: 20, refundReason: 'broken', refundType: 'refund_with_return',
      }).where(eq(sales.id, sale.id)).run();
      tx.update(items).set({ status: 'returned', removalDate: null, updatedAt: now() })
        .where(eq(items.id, item.id)).run();
    });
    const afterItem = db.select().from(items).where(eq(items.id, item.id)).get();
    const afterSale = db.select().from(sales).where(eq(sales.id, sale.id)).get();
    expect(afterItem?.status).toBe('returned');
    expect(afterItem?.removalDate).toBeNull();
    expect(afterSale?.refundType).toBe('refund_with_return');
    expect(afterSale?.refundAmount).toBe(20);
  });

  it('refund_no_return keeps item status as sold', () => {
    const item = createItem({ status: 'sold', removalDate: now() });
    const sale = createSale(item.id);
    db.transaction((tx) => {
      tx.update(sales).set({
        refundAmount: 10, refundReason: 'partial', refundType: 'refund_no_return',
      }).where(eq(sales.id, sale.id)).run();
      // item stays sold
    });
    const afterItem = db.select().from(items).where(eq(items.id, item.id)).get();
    const afterSale = db.select().from(sales).where(eq(sales.id, sale.id)).get();
    expect(afterItem?.status).toBe('sold');
    expect(afterSale?.refundType).toBe('refund_no_return');
  });

  it('deleting a sale reverts item status to available', () => {
    const item = createItem({ status: 'sold', removalDate: now() });
    const sale = createSale(item.id);
    db.transaction((tx) => {
      tx.delete(sales).where(eq(sales.id, sale.id)).run();
      tx.update(items).set({ status: 'available', removalDate: null, updatedAt: now() })
        .where(eq(items.id, item.id)).run();
    });
    const afterItem = db.select().from(items).where(eq(items.id, item.id)).get();
    expect(afterItem?.status).toBe('available');
    expect(afterItem?.removalDate).toBeNull();
  });
});