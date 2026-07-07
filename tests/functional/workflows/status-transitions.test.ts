import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, cleanupTestDb, getTestDb } from '../../setup/db';
import { items, users } from '@/lib/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { isValidTransition, REMOVAL_STATUSES, type ItemStatus } from '@/lib/constants';

describe('status transitions workflow', () => {
  beforeEach(() => createTestDb());
  afterEach(() => cleanupTestDb());

  async function createItem(status: ItemStatus = 'available') {
    const db = getTestDb();
    const now = Math.floor(Date.now() / 1000);
    // Create user first.
    const hash = await bcrypt.hash('TestP@ss1', 10);
    const u = db.insert(users).values({ email: 'test@test.com', passwordHash: hash, name: 'Test', role: 'user' }).returning();
    const item = db.insert(items).values({
      name: 'Test Item', purchaseDate: now, purchasePrice: 10, ownerId: u[0].id, status, createdAt: now, updatedAt: now,
    }).returning();
    return item[0];
  }

  async function updateStatus(id: number, newStatus: ItemStatus) {
    const db = getTestDb();
    const item = db.query.items.findFirst({ where: eq(items.id, id) });
    if (!item) throw new Error('Item not found');
    if (!isValidTransition(item.status as ItemStatus, newStatus)) {
      throw new Error(`Invalid transition: ${item.status} → ${newStatus}`);
    }
    const updateData: Record<string, unknown> = { status: newStatus, updatedAt: Math.floor(Date.now() / 1000) };
    if (REMOVAL_STATUSES.includes(newStatus)) updateData.removalDate = Math.floor(Date.now() / 1000);
    if (item.status === 'returned' && newStatus === 'available') updateData.removalDate = null;
    db.update(items).set(updateData).where(eq(items.id, id)).run();
    return db.query.items.findFirst({ where: eq(items.id, id) })!;
  }

  it('allows available → sold', async () => {
    const item = await createItem('available');
    const updated = await updateStatus(item.id, 'sold');
    expect(updated.status).toBe('sold');
  });

  it('allows available → donated and sets removalDate', async () => {
    const item = await createItem('available');
    const updated = await updateStatus(item.id, 'donated');
    expect(updated.status).toBe('donated');
    expect(updated.removalDate).not.toBeNull();
  });

  it('allows available → discarded and sets removalDate', async () => {
    const item = await createItem('available');
    const updated = await updateStatus(item.id, 'discarded');
    expect(updated.status).toBe('discarded');
    expect(updated.removalDate).not.toBeNull();
  });

  it('does NOT create a $0 sale when donated', async () => {
    const db = getTestDb();
    const item = await createItem('available');
    await updateStatus(item.id, 'donated');
    const { sales } = await import('@/lib/schema');
    const allSales = db.select().from(sales).all();
    expect(allSales).toHaveLength(0);
  });

  it('does NOT create a $0 sale when discarded', async () => {
    const db = getTestDb();
    const item = await createItem('available');
    await updateStatus(item.id, 'discarded');
    const { sales } = await import('@/lib/schema');
    const allSales = db.select().from(sales).all();
    expect(allSales).toHaveLength(0);
  });

  it('rejects sold → available (invalid)', async () => {
    const item = await createItem('sold');
    await expect(updateStatus(item.id, 'available')).rejects.toThrow('Invalid transition');
  });

  it('allows sold → returned → available (clears removalDate)', async () => {
    const item = await createItem('sold');
    const returned = await updateStatus(item.id, 'returned');
    expect(returned.status).toBe('returned');
    const available = await updateStatus(item.id, 'available');
    expect(available.status).toBe('available');
    expect(available.removalDate).toBeNull();
  });

  it('rejects donated → any (terminal)', async () => {
    const item = await createItem('donated');
    await expect(updateStatus(item.id, 'available')).rejects.toThrow('Invalid transition');
    await expect(updateStatus(item.id, 'sold')).rejects.toThrow('Invalid transition');
  });
});
