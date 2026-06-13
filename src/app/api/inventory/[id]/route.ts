import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canViewAllData, canEditOthersData } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, photos, sales } from '@/lib/schema';
import { updateItemSchema } from '@/lib/validations';
import { eq, and } from 'drizzle-orm';
import { isValidTransition } from '@/lib/constants';
import { handleApiError, ApiErrors } from '@/lib/api-errors';

export const GET = withAuth(async (req, ctx, session) => {
  const { id } = await ctx.params;
  const itemId = parseInt(id);

  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
    with: { photos: true, sales: true },
  });

  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  if (item.ownerId !== parseInt(session.user.id) && !canViewAllData(session)) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  return NextResponse.json(item);
});

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = parseInt(id);

  const existing = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  if (existing.ownerId !== parseInt(session.user.id) && !canEditOthersData(session)) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const body = await req.json();
  const validation = updateItemSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
      { status: 400 }
    );
  }

  const updateData: any = { ...validation.data, updatedAt: new Date() };

  if (validation.data.status && validation.data.status !== existing.status) {
    if (!isValidTransition(existing.status, validation.data.status)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${existing.status} to ${validation.data.status}` },
        { status: 400 }
      );
    }

    if (['donated', 'discarded'].includes(validation.data.status)) {
      updateData.removalDate = new Date();
    }
    if (validation.data.status === 'available' && existing.status === 'returned') {
      updateData.removalDate = null;
    }
  }

  if (validation.data.purchaseDate) {
    updateData.purchaseDate = new Date(validation.data.purchaseDate);
  }
  if (validation.data.removalDate !== undefined) {
    updateData.removalDate = validation.data.removalDate ? new Date(validation.data.removalDate) : null;
  }

  const updated = await db.update(items).set(updateData).where(eq(items.id, itemId)).returning() as any[];
  return NextResponse.json(updated[0]);
});

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = parseInt(id);

  const existing = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  if (existing.ownerId !== parseInt(session.user.id) && !canEditOthersData(session)) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  await db.delete(photos).where(eq(photos.itemId, itemId));
  await db.delete(sales).where(eq(sales.itemId, itemId));
  await db.delete(items).where(eq(items.id, itemId));

  return NextResponse.json({ success: true });
});