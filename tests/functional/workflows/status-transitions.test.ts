import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { items, users, sales } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { createTestDb, type TestDbHandle } from '../../setup/db';
import { isValidTransition, removalDateForTransition } from '@/lib/constants';

let handle: TestDbHandle;
let ownerId: number;

function createItem(overrides: Partial<typeof items.$inferInsert> = {}) {
  const now = Date.now();
  return db
    .insert(items)
    .values({
      name: 'Test Item',
      purchaseDate: now,
      purchasePrice: 10,
      status: 'available',
      ownerId,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .returning()
    .get();
}

function updateStatus(id: number, status: typeof items.$inferSelect.status) {
  const item = db.select().from(items).where(eq(items.id, id)).get()!;
  const now = Date.now();
  const update: Record<string, unknown> = { status, updatedAt: now };
  const removal = removalDateForTransition(status, item.status, now);
  if (removal !== undefined) update.removalDate = removal;
  return db.update(items).set(update).where(eq(items.id, id)).returning().get();
}

describe('status transitions (functional)', () => {
  beforeAll(() => {
    handle = createTestDb();
    const now = Date.now();
    const user = db
      .insert(users)
      .values({
        email: 'owner@test.com',
        passwordHash: '$2a$10$dummy',
        name: 'Owner',
        role: 'user',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    ownerId = user.id;
  });

  afterAll(() => handle.cleanup());

  describe('valid transitions', () => {
    it('available → listed', () => {
      const item = createItem();
      const updated = updateStatus(item.id, 'listed');
      expect(updated.status).toBe('listed');
      expect(updated.removalDate).toBeNull();
    });

    it('available → sold sets removalDate', () => {
      const item = createItem();
      const updated = updateStatus(item.id, 'sold');
      expect(updated.status).toBe('sold');
      expect(updated.removalDate).not.toBeNull();
    });

    it('listed → available (no removalDate set)', () => {
      const item = createItem({ status: 'listed' });
      const updated = updateStatus(item.id, 'available');
      expect(updated.status).toBe('available');
    });

    it('sold → returned', () => {
      const item = createItem({ status: 'sold', removalDate: Date.now() });
      const updated = updateStatus(item.id, 'returned');
      expect(updated.status).toBe('returned');
    });

    it('returned → available clears removalDate', () => {
      const item = createItem({ status: 'returned', removalDate: Date.now() });
      const updated = updateStatus(item.id, 'available');
      expect(updated.status).toBe('available');
      expect(updated.removalDate).toBeNull();
    });

    it('available → donated sets removalDate', () => {
      const item = createItem();
      const updated = updateStatus(item.id, 'donated');
      expect(updated.status).toBe('donated');
      expect(updated.removalDate).not.toBeNull();
    });

    it('available → discarded sets removalDate', () => {
      const item = createItem();
      const updated = updateStatus(item.id, 'discarded');
      expect(updated.status).toBe('discarded');
      expect(updated.removalDate).not.toBeNull();
    });
  });

  describe('invalid transitions rejected by isValidTransition', () => {
    const cases: Array<[string, string]> = [
      ['sold', 'available'],
      ['available', 'returned'],
      ['donated', 'available'],
      ['donated', 'sold'],
      ['discarded', 'available'],
      ['discarded', 'sold'],
      ['returned', 'sold'],
    ];
    for (const [from, to] of cases) {
      it(`${from} → ${to} is invalid`, () => {
        expect(isValidTransition(from as any, to as any)).toBe(false);
      });
    }
  });

  describe('no $0 auto-sales for donated/discarded', () => {
    it('donating an item does NOT create a sale record', () => {
      const item = createItem();
      updateStatus(item.id, 'donated');
      const saleCount = db.select().from(sales).where(eq(sales.itemId, item.id)).all().length;
      expect(saleCount).toBe(0);
    });

    it('discarding an item does NOT create a sale record', () => {
      const item = createItem();
      updateStatus(item.id, 'discarded');
      const saleCount = db.select().from(sales).where(eq(sales.itemId, item.id)).all().length;
      expect(saleCount).toBe(0);
    });
  });
});