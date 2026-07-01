import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { bulkStatusSchema } from '@/lib/validations';
import { isValidTransition, isTerminalStatus, type ItemStatus } from '@/lib/constants';
import { ApiErrors } from '@/lib/api-errors';
import { eq, inArray } from 'drizzle-orm';
import { nowTimestamp } from '@/lib/utils';
import type { Session } from 'next-auth';

export const PATCH = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = bulkStatusSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 },
    );
  }

  const { ids, status: newStatus } = validation.data;
  const targetItems = await db.select().from(items).where(inArray(items.id, ids));

  if (targetItems.length !== ids.length) {
    throw ApiErrors.NotFound('One or more items');
  }

  // Verify ownership for all items
  const userId = parseInt(session.user.id, 10);
  for (const item of targetItems) {
    if (item.ownerId !== userId && session.user.role !== 'admin') {
      throw ApiErrors.Forbidden();
    }
    if (!isValidTransition(item.status as ItemStatus, newStatus as ItemStatus)) {
      throw ApiErrors.BadRequest(`Invalid status transition from ${item.status} to ${newStatus} for item ${item.id}`);
    }
  }

  const now = nowTimestamp();
  const removalDate = isTerminalStatus(newStatus as ItemStatus) ? now : null;

  await db.update(items)
    .set({ status: newStatus, removalDate, updatedAt: now })
    .where(inArray(items.id, ids));

  return NextResponse.json({ success: true, updated: ids.length });
});

export const DELETE = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids') || '';
  const ids = idsParam.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));

  if (ids.length === 0) {
    throw ApiErrors.BadRequest('No item IDs provided');
  }

  const targetItems = await db.select().from(items).where(inArray(items.id, ids));
  if (targetItems.length !== ids.length) {
    throw ApiErrors.NotFound('One or more items');
  }

  const userId = parseInt(session.user.id, 10);
  for (const item of targetItems) {
    if (item.ownerId !== userId && session.user.role !== 'admin') {
      throw ApiErrors.Forbidden();
    }
  }

  // Cascade delete sales and photos
  const { sales, photos } = await import('@/lib/schema');
  await db.delete(sales).where(inArray(sales.itemId, ids));
  await db.delete(photos).where(inArray(photos.itemId, ids));
  await db.delete(items).where(inArray(items.id, ids));

  return NextResponse.json({ success: true, deleted: ids.length });
});