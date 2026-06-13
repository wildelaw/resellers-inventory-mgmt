import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, sales, photos } from '@/lib/schema';
import { updateItemSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { canAccessResource } from '@/lib/auth-utils';
import { isValidTransition, getAllowedTransitions } from '@/lib/constants';
import { eq } from 'drizzle-orm';

export const GET = withAuth(async (_req, ctx, session) => {
  const { id } = await ctx.params;
  const item = await db.select().from(items).where(eq(items.id, Number(id))).get();

  if (!item) {
    throw ApiErrors.NotFound('Item');
  }

  if (!canAccessResource(item.ownerId, Number(session.user.id), session, 'read')) {
    throw ApiErrors.Forbidden();
  }

  return NextResponse.json(item);
}, { requireAdmin: false });

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const item = await db.select().from(items).where(eq(items.id, Number(id))).get();

  if (!item) {
    throw ApiErrors.NotFound('Item');
  }

  if (!canAccessResource(item.ownerId, Number(session.user.id), session, 'write')) {
    throw ApiErrors.Forbidden();
  }

  const body = await req.json();
  const parsed = updateItemSchema.parse(body);

  // Build update data from validated fields
  const updateData: Record<string, unknown> = {
    ...parsed,
    updatedAt: Math.floor(Date.now() / 1000),
  };

  // Validate status transitions if status is being changed
  if (parsed.status && parsed.status !== item.status) {
    if (!isValidTransition(item.status, parsed.status)) {
      const allowed = getAllowedTransitions(item.status);
      throw ApiErrors.BadRequest(
        `Cannot transition item from "${item.status}" to "${parsed.status}". Allowed transitions: ${allowed.join(', ') || 'none'}`
      );
    }
  }

  // Auto-manage removalDate based on status transitions
  if (parsed.status && parsed.status !== item.status) {
    if (['sold', 'donated', 'discarded'].includes(parsed.status)) {
      // Set removalDate for terminal statuses (if not already set on the item)
      if (!item.removalDate) {
        updateData.removalDate = Math.floor(Date.now() / 1000);
      }
    } else if (parsed.status === 'available' || parsed.status === 'listed' || parsed.status === 'returned') {
      // Clear removalDate when returning to non-terminal status
      updateData.removalDate = null;
    }
  }

  const result = await db.update(items)
    .set(updateData)
    .where(eq(items.id, Number(id)))
    .returning().get();

  return NextResponse.json(result);
}, { requireAdmin: false });

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const item = await db.select().from(items).where(eq(items.id, Number(id))).get();

  if (!item) {
    throw ApiErrors.NotFound('Item');
  }

  if (!canAccessResource(item.ownerId, Number(session.user.id), session, 'write')) {
    throw ApiErrors.Forbidden();
  }

  // Cascade delete: photos, sales
  await db.delete(photos).where(eq(photos.itemId, Number(id))).run();
  await db.delete(sales).where(eq(sales.itemId, Number(id))).run();
  await db.delete(items).where(eq(items.id, Number(id))).run();

  return NextResponse.json({ success: true });
}, { requireAdmin: false });