import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, photos, sales } from '@/lib/schema';
import { updateItemSchema } from '@/lib/validations';
import { canViewAllData, canEditOthersData } from '@/lib/auth-utils';
import { isValidTransition, isTerminalStatus, type ItemStatus } from '@/lib/constants';
import { ApiErrors } from '@/lib/api-errors';
import { eq, and } from 'drizzle-orm';
import { nowTimestamp, toTimestamp } from '@/lib/utils';
import type { Session } from 'next-auth';

async function getItem(id: number) {
  return db.query.items.findFirst({
    where: eq(items.id, id),
    with: { photos: true, sales: true },
  });
}

export const GET = withAuth(async (_req: NextRequest, ctx, session: Session) => {
  const { id } = await ctx.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) throw ApiErrors.BadRequest('Invalid item ID');

  const item = await getItem(itemId);
  if (!item) throw ApiErrors.NotFound('Item');

  // RBAC: owner, admin, or canViewAll can read
  if (item.ownerId !== parseInt(session.user.id, 10) && !canViewAllData(session)) {
    throw ApiErrors.Forbidden();
  }

  return NextResponse.json(item);
});

export const PUT = withAuth(async (req: NextRequest, ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) throw ApiErrors.BadRequest('Invalid item ID');

  const item = await getItem(itemId);
  if (!item) throw ApiErrors.NotFound('Item');

  // RBAC: owner or admin can edit
  if (item.ownerId !== parseInt(session.user.id, 10) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const body = await req.json();
  const validation = updateItemSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 },
    );
  }

  const data = validation.data;
  const now = nowTimestamp();
  const update: Record<string, unknown> = { updatedAt: now };

  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  if (data.purchaseDate !== undefined) update.purchaseDate = toTimestamp(data.purchaseDate);
  if (data.purchasePrice !== undefined) update.purchasePrice = data.purchasePrice;
  if (data.purchaseLocation !== undefined) update.purchaseLocation = data.purchaseLocation;
  if (data.category !== undefined) update.category = data.category;
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.metadata !== undefined) update.metadata = data.metadata ? JSON.stringify(data.metadata) : null;

  // Status transition handling
  if (data.status !== undefined) {
    const newStatus = data.status as ItemStatus;
    if (!isValidTransition(item.status as ItemStatus, newStatus)) {
      throw ApiErrors.BadRequest(`Invalid status transition from ${item.status} to ${newStatus}`);
    }
    update.status = newStatus;
    if (isTerminalStatus(newStatus)) {
      update.removalDate = now;
    } else if (newStatus === 'available' && item.status === 'returned') {
      update.removalDate = null;
    }
  }

  const updated = await db.update(items).set(update).where(eq(items.id, itemId)).returning();
  return NextResponse.json(updated[0]);
});

export const DELETE = withAuth(async (req: NextRequest, ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) throw ApiErrors.BadRequest('Invalid item ID');

  const item = await getItem(itemId);
  if (!item) throw ApiErrors.NotFound('Item');

  if (item.ownerId !== parseInt(session.user.id, 10) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  // Hard delete with cascading photos/sales
  await db.delete(sales).where(eq(sales.itemId, itemId));
  await db.delete(photos).where(eq(photos.itemId, itemId));
  await db.delete(items).where(eq(items.id, itemId));

  return NextResponse.json({ success: true });
});