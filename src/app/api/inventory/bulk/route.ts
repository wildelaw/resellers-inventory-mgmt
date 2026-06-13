import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, photos, sales } from '@/lib/schema';
import { bulkStatusSchema, bulkDeleteSchema } from '@/lib/validations';
import { eq, inArray } from 'drizzle-orm';
import { isValidTransition } from '@/lib/constants';

export const PATCH = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = bulkStatusSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
      { status: 400 }
    );
  }

  const { ids, status } = validation.data;
  const userId = parseInt(session.user.id);

  const itemList = await db.select().from(items).where(inArray(items.id, ids));
  
  for (const item of itemList) {
    if (item.ownerId !== userId && session.user.role !== 'admin') {
      return NextResponse.json({ error: `Forbidden: cannot modify item ${item.id}` }, { status: 403 });
    }
    if (!isValidTransition(item.status, status)) {
      return NextResponse.json(
        { error: `Invalid transition from ${item.status} to ${status} for item ${item.id}` },
        { status: 400 }
      );
    }
  }

  const updateData: any = { status, updatedAt: new Date() };
  if (['donated', 'discarded'].includes(status)) {
    updateData.removalDate = new Date();
  }
  if (status === 'available') {
    updateData.removalDate = null;
  }

  await db.update(items).set(updateData).where(inArray(items.id, ids));

  return NextResponse.json({ success: true, updated: ids.length });
});

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const url = new URL(req.url);
  const idsParam = url.searchParams.get('ids');
  if (!idsParam) return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });

  const ids = idsParam.split(',').map(Number).filter(n => !isNaN(n));
  if (ids.length === 0) return NextResponse.json({ error: 'No valid IDs' }, { status: 400 });

  const userId = parseInt(session.user.id);
  const itemList = await db.select().from(items).where(inArray(items.id, ids));

  for (const item of itemList) {
    if (item.ownerId !== userId && session.user.role !== 'admin') {
      return NextResponse.json({ error: `Forbidden: cannot delete item ${item.id}` }, { status: 403 });
    }
  }

  await db.delete(photos).where(inArray(photos.itemId, ids));
  await db.delete(sales).where(inArray(sales.itemId, ids));
  await db.delete(items).where(inArray(items.id, ids));

  return NextResponse.json({ success: true, deleted: ids.length });
});