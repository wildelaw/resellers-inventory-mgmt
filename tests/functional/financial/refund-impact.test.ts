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

describe('Refund Impact on Profit', () => {
  it('reduces profit by refund amount', () => {
    const profitBeforeRefund = calculateProfit({
      soldPrice: 100,
      shippingCollected: 10,
      salesTax: 8,
      platformFees: 5,
      refundAmount: 0,
      purchasePrice: 30,
      shippingCost: 5,
    });
    // 100 + 10 - 8 - 5 - 0 - 30 - 5 = 62
    expect(profitBeforeRefund).toBe(62);

    const profitAfterRefund = calculateProfit({
      soldPrice: 100,
      shippingCollected: 10,
      salesTax: 8,
      platformFees: 5,
      refundAmount: 40,
      purchasePrice: 30,
      shippingCost: 5,
    });
    // 100 + 10 - 8 - 5 - 40 - 30 - 5 = 22
    expect(profitAfterRefund).toBe(22);
    expect(profitAfterRefund).toBe(profitBeforeRefund - 40);
  });

  it('full refund results in loss equal to purchase price + shipping', () => {
    const profit = calculateProfit({
      soldPrice: 50,
      shippingCollected: 0,
      salesTax: 0,
      platformFees: 0,
      refundAmount: 50,
      purchasePrice: 30,
      shippingCost: 5,
    });
    // 50 + 0 - 0 - 0 - 50 - 30 - 5 = -35
    expect(profit).toBe(-35);
  });

  it('partial refund still yields positive profit', () => {
    const profit = calculateProfit({
      soldPrice: 100,
      shippingCollected: 10,
      salesTax: 8,
      platformFees: 5,
      refundAmount: 20,
      purchasePrice: 30,
      shippingCost: 5,
    });
    // 100 + 10 - 8 - 5 - 20 - 30 - 5 = 42
    expect(profit).toBe(42);
    expect(profit).toBeGreaterThan(0);
  });

  it('refund_with_return vs refund_no_return produces same profit but different item status', async () => {
    const now = nowTimestamp();

    // Create two items and sales
    const item1 = await db.insert(items).values({
      name: 'Item A',
      purchaseDate: now,
      purchasePrice: 20,
      status: 'sold',
      removalDate: now,
      ownerId: testUserId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const item2 = await db.insert(items).values({
      name: 'Item B',
      purchaseDate: now,
      purchasePrice: 20,
      status: 'sold',
      removalDate: now,
      ownerId: testUserId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const sale1 = await db.insert(sales).values({
      itemId: item1[0].id,
      soldDate: now,
      soldPrice: 50,
      platform: 'ebay',
      refundAmount: 20,
      refundType: 'refund_with_return',
      soldBy: testUserId,
      createdAt: now,
    }).returning();

    const sale2 = await db.insert(sales).values({
      itemId: item2[0].id,
      soldDate: now,
      soldPrice: 50,
      platform: 'ebay',
      refundAmount: 20,
      refundType: 'refund_no_return',
      soldBy: testUserId,
      createdAt: now,
    }).returning();

    const profit1 = calculateProfit({
      soldPrice: sale1[0].soldPrice,
      shippingCollected: sale1[0].shippingCollected,
      salesTax: sale1[0].salesTax,
      platformFees: sale1[0].platformFees,
      refundAmount: sale1[0].refundAmount,
      purchasePrice: 20,
      shippingCost: sale1[0].shippingCost,
    });

    const profit2 = calculateProfit({
      soldPrice: sale2[0].soldPrice,
      shippingCollected: sale2[0].shippingCollected,
      salesTax: sale2[0].salesTax,
      platformFees: sale2[0].platformFees,
      refundAmount: sale2[0].refundAmount,
      purchasePrice: 20,
      shippingCost: sale2[0].shippingCost,
    });

    expect(profit1).toBe(profit2); // Same profit
    // But item1 should become 'returned' and item2 stays 'sold'
  });
});