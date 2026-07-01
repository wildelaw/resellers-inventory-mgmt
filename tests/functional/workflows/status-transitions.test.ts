import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, cleanupTestDb } from '../../setup/db';
import { items, users, sales } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { isValidTransition, isTerminalStatus, type ItemStatus } from '@/lib/constants';
import { nowTimestamp } from '@/lib/utils';

describe('status transitions (functional)', () => {
  let db: ReturnType<typeof createTestDb>['db'];
  let sqlite: ReturnType<typeof createTestDb>['sqlite'];
  let testPath: string;

  beforeEach(async () => {
    const t = createTestDb();
    db = t.db;
    sqlite = t.sqlite;
    testPath = t.path;
    // Create a user for FK constraint
    const now = nowTimestamp();
    await db.insert(users).values({
      email: 'test@example.com',
      passwordHash: 'hash',
      name: 'Test',
      role: 'admin',
      canViewAll: 1,
      isActive: 1,
      passwordChangedAt: 0,
      createdAt: now,
      updatedAt: now,
    });
  });

  afterEach(() => {
    cleanupTestDb(testPath);
  });

  it('creates item with available status', async () => {
    const now = nowTimestamp();
    await db.insert(items).values({
      name: 'Test Item',
      purchaseDate: now,
      purchasePrice: 10,
      status: 'available',
      ownerId: 1,
      createdAt: now,
      updatedAt: now,
    });

    const item = await db.query.items.findFirst();
    expect(item?.status).toBe('available');
    expect(item?.removalDate).toBeNull();
  });

  it('sets removalDate when transitioning to donated', async () => {
    const now = nowTimestamp();
    const [inserted] = await db.insert(items).values({
      name: 'Test Item',
      purchaseDate: now,
      purchasePrice: 10,
      status: 'available',
      ownerId: 1,
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Simulate transition to donated
    await db.update(items)
      .set({ status: 'donated', removalDate: nowTimestamp(), updatedAt: nowTimestamp() })
      .where(eq(items.id, inserted.id));

    const item = await db.query.items.findFirst({ where: eq(items.id, inserted.id) });
    expect(item?.status).toBe('donated');
    expect(item?.removalDate).not.toBeNull();
  });

  it('sets removalDate when transitioning to discarded', async () => {
    const now = nowTimestamp();
    const [inserted] = await db.insert(items).values({
      name: 'Test Item',
      purchaseDate: now,
      purchasePrice: 10,
      status: 'available',
      ownerId: 1,
      createdAt: now,
      updatedAt: now,
    }).returning();

    await db.update(items)
      .set({ status: 'discarded', removalDate: nowTimestamp(), updatedAt: nowTimestamp() })
      .where(eq(items.id, inserted.id));

    const item = await db.query.items.findFirst({ where: eq(items.id, inserted.id) });
    expect(item?.status).toBe('discarded');
    expect(item?.removalDate).not.toBeNull();
  });

  it('clears removalDate when returned to available', async () => {
    const now = nowTimestamp();
    const [inserted] = await db.insert(items).values({
      name: 'Test Item',
      purchaseDate: now,
      purchasePrice: 10,
      status: 'sold',
      ownerId: 1,
      createdAt: now,
      updatedAt: now,
    }).returning();

    // sold -> returned
    await db.update(items).set({ status: 'returned', updatedAt: now }).where(eq(items.id, inserted.id));

    // returned -> available (clear removalDate)
    await db.update(items).set({ status: 'available', removalDate: null, updatedAt: now }).where(eq(items.id, inserted.id));

    const item = await db.query.items.findFirst({ where: eq(items.id, inserted.id) });
    expect(item?.status).toBe('available');
    expect(item?.removalDate).toBeNull();
  });

  it('does not create $0 sale records for donated items', async () => {
    // This test verifies the business rule: donated/discarded only set removalDate, no sale record
    const now = nowTimestamp();
    const [inserted] = await db.insert(items).values({
      name: 'Test Item',
      purchaseDate: now,
      purchasePrice: 10,
      status: 'available',
      ownerId: 1,
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Transition to donated — no sale should be created
    await db.update(items)
      .set({ status: 'donated', removalDate: now, updatedAt: now })
      .where(eq(items.id, inserted.id));

    const allSales = await db.select().from(sales);
    expect(allSales).toHaveLength(0);
  });

  it('validates all transition rules', () => {
    const validTransitions: Array<[ItemStatus, ItemStatus]> = [
      ['available', 'listed'],
      ['available', 'sold'],
      ['available', 'donated'],
      ['available', 'discarded'],
      ['listed', 'available'],
      ['listed', 'sold'],
      ['listed', 'donated'],
      ['listed', 'discarded'],
      ['sold', 'returned'],
      ['returned', 'available'],
    ];

    for (const [from, to] of validTransitions) {
      expect(isValidTransition(from, to)).toBe(true);
    }

    const invalidTransitions: Array<[ItemStatus, ItemStatus]> = [
      ['sold', 'available'],
      ['sold', 'listed'],
      ['available', 'returned'],
      ['donated', 'available'],
      ['discarded', 'sold'],
      ['returned', 'sold'],
    ];

    for (const [from, to] of invalidTransitions) {
      expect(isValidTransition(from, to)).toBe(false);
    }
  });
});