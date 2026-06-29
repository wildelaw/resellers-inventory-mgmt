import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, getRawDb } from '@/lib/db';
import { items, photos, sales, nowTs } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canViewAllData, canEditOthersData, currentUserId } from '@/lib/auth-utils';
import { updateItemSchema } from '@/lib/validations';
import { computeStatusUpdate } from '@/lib/inventory-logic';
import { ApiErrors } from '@/lib/api-errors';
import type { ItemStatus } from '@/lib/constants';

async function loadItem(id: number) {
  const item = db.query.items.findFirst({
    where: eq(items.id, id),
    with: { photos: true, sales: true },
  }).sync();
  if (!item) throw ApiErrors.NotFound('Item');
  return item;
}

export const GET = withAuth(async (req, ctx, session) => {
  const { id } = await ctx.params;
  const itemId = parseInt(id, 10);
  if (!Number.isFinite(itemId) || itemId <= 0) throw ApiErrors.BadRequest('Invalid id');

  const item = await loadItem(itemId);
  // RBAC read: owner, admin, or canViewAll
  const uid = currentUserId(session);
  if (item.ownerId !== uid && !canViewAllData(session)) throw ApiErrors.Forbidden();
  return NextResponse.json(item);
});

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = parseInt(id, 10);
  if (!Number.isFinite(itemId) || itemId <= 0) throw ApiErrors.BadRequest('Invalid id');

  const existing = db.query.items.findFirst({ where: eq(items.id, itemId) }).sync();
  if (!existing) throw ApiErrors.NotFound('Item');

  const uid = currentUserId(session);
  if (existing.ownerId !== uid && !canEditOthersData(session)) throw ApiErrors.Forbidden();

  const body = await req.json();
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const update: Record<string, unknown> = { updatedAt: nowTs() };
  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  if (data.purchaseDate !== undefined && data.purchaseDate !== null) update.purchaseDate = data.purchaseDate;
  if (data.purchasePrice !== undefined) update.purchasePrice = data.purchasePrice;
  if (data.purchaseLocation !== undefined) update.purchaseLocation = data.purchaseLocation;
  if (data.category !== undefined) update.category = data.category;
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.metadata !== undefined) update.metadata = data.metadata ? JSON.stringify(data.metadata) : null;

  if (data.status !== undefined) {
    const res = computeStatusUpdate(existing.status as ItemStatus, data.status as ItemStatus, existing.removalDate);
    update.status = res.status;
    update.removalDate = res.removalDate;
  } else if (data.removalDate !== undefined) {
    update.removalDate = data.removalDate;
  }

  const [updated] = db.update(items).set(update).where(eq(items.id, itemId)).returning().all();
  return NextResponse.json(updated);
});

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = parseInt(id, 10);
  if (!Number.isFinite(itemId) || itemId <= 0) throw ApiErrors.BadRequest('Invalid id');

  const existing = db.query.items.findFirst({ where: eq(items.id, itemId) }).sync();
  if (!existing) throw ApiErrors.NotFound('Item');

  const uid = currentUserId(session);
  if (existing.ownerId !== uid && !canEditOthersData(session)) throw ApiErrors.Forbidden();

  // Cascading delete: photos + sales removed via FK ON DELETE CASCADE on photos;
  // sales.itemId has onDelete cascade too. Run in a transaction to be safe.
  const sqlite = getRawDb();
  const tx = sqlite.transaction(() => {
    db.delete(sales).where(eq(sales.itemId, itemId)).run();
    db.delete(photos).where(eq(photos.itemId, itemId)).run();
    db.delete(items).where(eq(items.id, itemId)).run();
  });
  tx();

  return NextResponse.json({ success: true });
});