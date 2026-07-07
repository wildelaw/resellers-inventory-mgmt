import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, cleanupTestDb } from '../../setup/db';
import { items, users } from '../../../src/lib/schema';
import { isValidTransition, type ItemStatus } from '../../../src/lib/constants';
import { nowTimestamp, toTimestamp } from '../../../src/lib/utils';
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

describe('Status Transitions', () => {
  it('creates item with available status', async () => {
    const now = nowTimestamp();
    const item = await db.insert(items).values({
      name: 'Test Item',
      purchaseDate: now,
      purchasePrice: 25,
      status: 'available',
      ownerId: testUserId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    expect(item[0].status).toBe('available');
    expect(item[0].removalDate).toBeNull();
  });

  it('sets removalDate when transitioning to donated', async () => {
    const now = nowTimestamp();
    const item = await db.insert(items).values({
      name: 'Donated Item',
      purchaseDate: now,
      purchasePrice: 10,
      status: 'available',
      ownerId: testUserId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    expect(isValidTransition('available', 'donated')).toBe(true);

    const updated = await db.update(items)
      .set({ status: 'donated', removalDate: now, updatedAt: now })
      .where(eq(items.id, item[0].id))
      .returning();

    expect(updated[0].status).toBe('donated');
    expect(updated[0].removalDate).not.toBeNull();
  });

  it('sets removalDate when transitioning to discarded', async () => {
    const now = nowTimestamp();
    const item = await db.insert(items).values({
      name: 'Discarded Item',
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

    expect(updated[0].status).toBe('discarded');
    expect(updated[0].removalDate).not.toBeNull();
  });

  it('clears removalDate when returned to available', async () => {
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

    expect(isValidTransition('returned', 'available')).toBe(true);

    const updated = await db.update(items)
      .set({ status: 'available', removalDate: null, updatedAt: now })
      .where(eq(items.id, item[0].id))
      .returning();

    expect(updated[0].status).toBe('available');
    expect(updated[0].removalDate).toBeNull();
  });

  it('validates all transition rules', () => {
    const valid: Array<[ItemStatus, ItemStatus]> = [
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

    for (const [from, to] of valid) {
      expect(isValidTransition(from, to)).toBe(true);
    }

    const invalid: Array<[ItemStatus, ItemStatus]> = [
      ['sold', 'available'],
      ['sold', 'listed'],
      ['donated', 'available'],
      ['donated', 'sold'],
      ['discarded', 'available'],
      ['discarded', 'sold'],
      ['available', 'available'],
    ];

    for (const [from, to] of invalid) {
      expect(isValidTransition(from, to)).toBe(false);
    }
  });
});