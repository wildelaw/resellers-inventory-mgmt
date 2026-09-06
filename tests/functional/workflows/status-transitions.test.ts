import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupTestDb } from '../../setup/db';
import { mockSession } from '../../setup/session';
import { jsonRequest, paramsCtx } from '../../setup/request';
import { ALLOWED_TRANSITIONS, getAllowedTransitions, isValidTransition, ALL_STATUSES } from '@/lib/constants';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

type Db = Awaited<ReturnType<typeof setupTestDb>>['db'];
let db: Db;
let itemRoute: typeof import('@/app/api/inventory/[id]/route');

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  itemRoute = await import('@/app/api/inventory/[id]/route');
});

beforeEach(async () => {
  const { auth } = await import('@/lib/auth');
  vi.mocked(auth).mockResolvedValue(mockSession({ id: 1 }) as never);
});

// Each test creates a fresh item in `from` status, then drives the transition
// through the real PUT /api/inventory/[id] handler.
describe('status transitions through the API', () => {
  let counter = 0;

  async function createItem(status: string): Promise<number> {
    counter++;
    const { items, users } = await import('@/lib/schema');
    // Ensure owner user exists
    const existing = await db.select().from(users);
    if (existing.length === 0) {
      await db.insert(users).values({
        id: 1,
        email: 'owner@test.com',
        passwordHash: 'x',
        name: 'Owner',
        role: 'admin',
        canViewAll: true,
        isActive: true,
        passwordChangedAt: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    const [row] = await db.insert(items).values({
      name: `Item ${counter}`,
      purchaseDate: new Date('2026-01-01'),
      purchasePrice: 10,
      status: status as never,
      ownerId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return row.id;
  }

  async function transition(itemId: number, to: string) {
    const res = await itemRoute.PUT(
      jsonRequest(`http://localhost:3000/api/inventory/${itemId}`, 'PUT', { status: to }),
      paramsCtx({ id: String(itemId) })
    );
    return res;
  }

  it('performs every valid transition and applies removalDate side effects', async () => {
    for (const [from, tos] of Object.entries(ALLOWED_TRANSITIONS)) {
      for (const to of tos) {
        const itemId = await createItem(from);
        const res = await transition(itemId, to);
        expect(res.status, `${from} → ${to}`).toBe(200);

        const { items } = await import('@/lib/schema');
        const [row] = await db.select().from(items).where(eq(items.id, itemId));
        expect(row.status).toBe(to);

        // Side effects: sold/donated/discarded set removalDate; available clears it
        if (to === 'sold' || to === 'donated' || to === 'discarded') {
          expect(row.removalDate, `${from} → ${to} should set removalDate`).not.toBeNull();
        }
        if (to === 'available') {
          expect(row.removalDate, `${from} → ${to} should clear removalDate`).toBeNull();
        }
        if (to === 'listed') {
          expect(row.removalDate).toBeNull();
        }
      }
    }
  });

  it('rejects every invalid transition with 400', async () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        if (isValidTransition(from, to)) continue;
        const itemId = await createItem(from);
        const res = await transition(itemId, to);
        expect(res.status, `${from} → ${to} should be rejected`).toBe(400);
        const { items } = await import('@/lib/schema');
        const [row] = await db.select().from(items).where(eq(items.id, itemId));
        expect(row.status).toBe(from); // unchanged
      }
    }
  });

  it('matches the getAllowedTransitions table', () => {
    expect(getAllowedTransitions('sold')).toEqual(['returned']);
    expect(getAllowedTransitions('returned')).toEqual(['available']);
  });

  it('never creates a $0 sale on sold/donated/discarded transitions', async () => {
    const { sales } = await import('@/lib/schema');
    const itemId = await createItem('available');
    await transition(itemId, 'sold');
    const saleRows = await db.select().from(sales);
    expect(saleRows).toHaveLength(0);
  });
});