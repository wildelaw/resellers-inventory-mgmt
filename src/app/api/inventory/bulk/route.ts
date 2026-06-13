import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, photos, sales } from '@/lib/schema';
import { bulkStatusSchema, bulkDeleteSchema } from '@/lib/validations';
import { isValidTransition } from '@/lib/constants';
import { ApiErrors } from '@/lib/api-errors';
import { eq, inArray } from 'drizzle-orm';

export async function PATCH(req: NextRequest) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const body = await req.json();
    const validation = bulkStatusSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    const { ids, status: newStatus } = validation.data;
    const itemRows = await db.query.items.findMany({ where: inArray(items.id, ids) });
    const errors: string[] = [];
    const validIds: number[] = [];
    const now = Math.floor(Date.now() / 1000);
    for (const item of itemRows) {
      if (session.user.role !== 'admin' && item.ownerId !== session.user.id) { errors.push(`Item ${item.id}: not authorized`); continue; }
      if (!isValidTransition(item.status as any, newStatus as any)) { errors.push(`Item ${item.id}: cannot transition from "${item.status}" to "${newStatus}"`); continue; }
      validIds.push(item.id);
    }
    if (validIds.length === 0) return NextResponse.json({ error: 'No valid items to update', details: errors }, { status: 400 });
    const updates: Record<string, unknown> = { status: newStatus, updatedAt: now };
    if (['donated', 'discarded'].includes(newStatus)) updates.removalDate = now;
    if (newStatus === 'available') updates.removalDate = null;
    await db.update(items).set(updates).where(inArray(items.id, validIds));
    return NextResponse.json({ updated: validIds.length, errors: errors.length > 0 ? errors : undefined });
  });
}

export async function DELETE(req: NextRequest) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const idsParam = req.nextUrl.searchParams.get('ids');
    if (!idsParam) throw ApiErrors.BadRequest('ids parameter required');
    const ids = idsParam.split(',').map(Number).filter(n => !isNaN(n));
    if (ids.length === 0) throw ApiErrors.BadRequest('No valid IDs provided');
    const itemRows = await db.query.items.findMany({ where: inArray(items.id, ids) });
    const validIds: number[] = [];
    const errors: string[] = [];
    for (const item of itemRows) {
      if (session.user.role !== 'admin' && item.ownerId !== session.user.id) { errors.push(`Item ${item.id}: not authorized`); continue; }
      validIds.push(item.id);
    }
    if (validIds.length === 0) return NextResponse.json({ error: 'No valid items to delete', details: errors }, { status: 400 });
    for (const id of validIds) { await db.delete(photos).where(eq(photos.itemId, id)); await db.delete(sales).where(eq(sales.itemId, id)); }
    await db.delete(items).where(inArray(items.id, validIds));
    return NextResponse.json({ deleted: validIds.length, errors: errors.length > 0 ? errors : undefined });
  });
}
