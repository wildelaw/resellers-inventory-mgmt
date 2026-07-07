import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, cleanupTestDb, getTestDb } from '../../setup/db';
import { items, users, sales } from '@/lib/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

describe('inventory removalDate', () => {
  beforeEach(() => createTestDb());
  afterEach(() => cleanupTestDb());

  it('sets removalDate when status changes to donated', async () => {
    const db = getTestDb();
    const now = Math.floor(Date.now() / 1000);
    const hash = await bcrypt.hash('T@ss1word', 10);
    const u = db.insert(users).values({ email: 't@t.com', passwordHash: hash, name: 'T' }).returning();
    const item = db.insert(items).values({ name: 'X', purchaseDate: now, purchasePrice: 5, ownerId: u[0].id }).returning();
    db.update(items).set({ status: 'donated', removalDate: now }).where(eq(items.id, item[0].id)).run();
    const updated = db.query.items.findFirst({ where: eq(items.id, item[0].id) });
    expect(updated!.removalDate).not.toBeNull();
  });

  it('clears removalDate when returned → available', async () => {
    const db = getTestDb();
    const now = Math.floor(Date.now() / 1000);
    const hash = await bcrypt.hash('T@ss1word', 10);
    const u = db.insert(users).values({ email: 't@t.com', passwordHash: hash, name: 'T' }).returning();
    const item = db.insert(items).values({ name: 'X', purchaseDate: now, purchasePrice: 5, ownerId: u[0].id, status: 'returned', removalDate: now }).returning();
    db.update(items).set({ status: 'available', removalDate: null }).where(eq(items.id, item[0].id)).run();
    const updated = db.query.items.findFirst({ where: eq(items.id, item[0].id) });
    expect(updated!.removalDate).toBeNull();
  });
});
