import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, sales, photos } from '@/lib/schema';
import { bulkStatusUpdateSchema, bulkDeleteSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { isValidTransition, getAllowedTransitions } from '@/lib/constants';
import { eq, inArray } from 'drizzle-orm';

export const PATCH = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = bulkStatusUpdateSchema.parse(body);
  const { ids, status } = parsed;

  // Fetch all items and verify ownership
  const targetItems = await db.select().from(items).where(inArray(items.id, ids)).all();

  if (targetItems.length !== ids.length) {
    throw ApiErrors.BadRequest('Some items not found');
  }

  for (const item of targetItems) {
    if (item.ownerId !== Number(session.user.id) && session.user.role !== 'admin') {
      throw ApiErrors.Forbidden();
    }
    if (!isValidTransition(item.status, status)) {
      const allowed = getAllowedTransitions(item.status);
      throw ApiErrors.BadRequest(
        `Cannot transition item ${item.id} from "${item.status}" to "${status}". Allowed: ${allowed.join(', ') || 'none'}`
      );
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: now,
  };

  // Set removalDate for terminal statuses
  if (['sold', 'donated', 'discarded'].includes(status)) {
    updateData.removalDate = now;
  } else if (['available', 'listed', 'returned'].includes(status)) {
    updateData.removalDate = null;
  }

  await db.update(items)
    .set(updateData)
    .where(inArray(items.id, ids))
    .run();

  return NextResponse.json({ success: true, updated: ids.length });
});

export const DELETE = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = bulkDeleteSchema.parse(body);
  const { ids } = parsed;

  // Fetch all items and verify ownership
  const targetItems = await db.select().from(items).where(inArray(items.id, ids)).all();

  if (targetItems.length !== ids.length) {
    throw ApiErrors.BadRequest('Some items not found');
  }

  for (const item of targetItems) {
    if (item.ownerId !== Number(session.user.id) && session.user.role !== 'admin') {
      throw ApiErrors.Forbidden();
    }
  }

  // Cascade delete: photos and sales for all items
  for (const itemId of ids) {
    await db.delete(photos).where(eq(photos.itemId, itemId)).run();
    await db.delete(sales).where(eq(sales.itemId, itemId)).run();
  }
  await db.delete(items).where(inArray(items.id, ids)).run();

  return NextResponse.json({ success: true, deleted: ids.length });
});