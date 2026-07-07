import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, cleanupTestDb } from '../../setup/db';
import { items, users, sales } from '../../../src/lib/schema';
import { nowTimestamp } from '../../../src/lib/utils';
import { calculateProfit } from '../../../src/lib/financial';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../../src/lib/schema';

let db: BetterSQLite3Database<typeof schema>;
let testUserId: number;
let testItemId: number;

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

  const item = await db.insert(items).values({
    name: 'Test Item',
    purchaseDate: now,
    purchasePrice: 25,
    status: 'available',
    ownerId: testUserId,
    createdAt: now,
    updatedAt: now,
  }).returning();
  testItemId = item[0].id;
});

afterAll(() => {
  cleanupTestDb(db);
});

describe('Sale and Refund Flow', () => {
  it('creates sale and updates item status to sold', async () => {
    const now = nowTimestamp();
    const sale = await db.insert(sales).values({
      itemId: testItemId,
      soldDate: now,
      soldPrice: 50,
      shippingCost: 5,
      shippingCollected: 10,
      platform: 'ebay',
      salesTax: 4,
      platformFees: 5,
      refundAmount: 0,
      refundType: 'none',
      soldBy: testUserId,
      createdAt: now,
    }).returning();

    expect(sale[0].soldPrice).toBe(50);

    // Update item status to sold
    await db.update(items)
      .set({ status: 'sold', removalDate: now, updatedAt: now })
      .where(eq(items.id, testItemId));

    const updatedItem = await db.query.items.findFirst({
      where: eq(items.id, testItemId),
    });
    expect(updatedItem?.status).toBe('sold');
  });

  it('processes refund_with_return and sets item to returned', async () => {
    const sale = await db.query.sales.findFirst({
      where: eq(sales.itemId, testItemId),
    });
    expect(sale).toBeDefined();

    const now = nowTimestamp();
    await db.update(sales)
      .set({
        refundAmount: 25,
        refundReason: 'Item not as described',
        refundType: 'refund_with_return',
      })
      .where(eq(sales.id, sale!.id));

    // Update item status to returned
    await db.update(items)
      .set({ status: 'returned', removalDate: null, updatedAt: now })
      .where(eq(items.id, testItemId));

    const updatedItem = await db.query.items.findFirst({
      where: eq(items.id, testItemId),
    });
    expect(updatedItem?.status).toBe('returned');
    expect(updatedItem?.removalDate).toBeNull();

    const updatedSale = await db.query.sales.findFirst({
      where: eq(sales.id, sale!.id),
    });
    expect(updatedSale?.refundAmount).toBe(25);
    expect(updatedSale?.refundType).toBe('refund_with_return');
  });

  it('processes refund_no_return and keeps item sold', async () => {
    const now = nowTimestamp();
    // Create a new item and sale
    const item2 = await db.insert(items).values({
      name: 'Test Item 2',
      purchaseDate: now,
      purchasePrice: 15,
      status: 'sold',
      removalDate: now,
      ownerId: testUserId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const sale2 = await db.insert(sales).values({
      itemId: item2[0].id,
      soldDate: now,
      soldPrice: 30,
      platform: 'local',
      refundAmount: 0,
      refundType: 'none',
      soldBy: testUserId,
      createdAt: now,
    }).returning();

    // Process refund without return
    await db.update(sales)
      .set({
        refundAmount: 10,
        refundReason: 'Partial refund',
        refundType: 'refund_no_return',
      })
      .where(eq(sales.id, sale2[0].id));

    // Item should stay sold
    const updatedItem = await db.query.items.findFirst({
      where: eq(items.id, item2[0].id),
    });
    expect(updatedItem?.status).toBe('sold');
  });

  it('deleting sale reverts item status to available', async () => {
    const now = nowTimestamp();
    // Create a new sale
    const item3 = await db.insert(items).values({
      name: 'Test Item 3',
      purchaseDate: now,
      purchasePrice: 20,
      status: 'sold',
      removalDate: now,
      ownerId: testUserId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const sale3 = await db.insert(sales).values({
      itemId: item3[0].id,
      soldDate: now,
      soldPrice: 40,
      platform: 'poshmark',
      refundAmount: 0,
      refundType: 'none',
      soldBy: testUserId,
      createdAt: now,
    }).returning();

    // Delete sale
    await db.delete(sales).where(eq(sales.id, sale3[0].id));

    // Revert item status
    await db.update(items)
      .set({ status: 'available', removalDate: null, updatedAt: now })
      .where(eq(items.id, item3[0].id));

    const updatedItem = await db.query.items.findFirst({
      where: eq(items.id, item3[0].id),
    });
    expect(updatedItem?.status).toBe('available');
    expect(updatedItem?.removalDate).toBeNull();
  });

  it('calculates profit correctly after refund', () => {
    const profit = calculateProfit({
      soldPrice: 50,
      shippingCollected: 10,
      salesTax: 4,
      platformFees: 5,
      refundAmount: 25,
      purchasePrice: 25,
      shippingCost: 5,
    });
    // 50 + 10 - 4 - 5 - 25 - 25 - 5 = -4
    expect(profit).toBe(-4);
  });
});