import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db, getRawDb } from '@/lib/db';
import { items, sales, photos } from '@/lib/schema';
import { withAuth, validateOriginOrReferer, parseIdList } from '@/lib/api-utils';
import { canEditOthersData, currentUserId } from '@/lib/auth-utils';
import { bulkStatusSchema } from '@/lib/validations';
import { computeStatusUpdate } from '@/lib/inventory-logic';
import { ApiErrors } from '@/lib/api-errors';
import type { ItemStatus } from '@/lib/constants';

export const PATCH = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = bulkStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const { ids, status } = parsed.data;
  const uid = currentUserId(session);
  const isAdmin = canEditOthersData(session);

  const selected = db.select().from(items).where(inArray(items.id, ids)).all();
  if (selected.length !== ids.length) throw ApiErrors.NotFound('Item');
  // owner-only for bulk; admin may do all.
  if (!isAdmin && selected.some((it) => it.ownerId !== uid)) throw ApiErrors.Forbidden();

  const sqlite = getRawDb();
  const tx = sqlite.transaction(() => {
    for (const it of selected) {
      const res = computeStatusUpdate(it.status as ItemStatus, status as ItemStatus, it.removalDate);
      // NO $0 sale auto-creation for donated/discarded (v2).
      db.update(items).set({
        status: res.status, removalDate: res.removalDate, updatedAt: res.updatedAt,
      }).where(eq(items.id, it.id)).run();
    }
  });
  tx();

  return NextResponse.json({ success: true, count: selected.length });
});

export const DELETE = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const ids = parseIdList(req.nextUrl.searchParams.get('ids'));
  if (ids.length === 0) throw ApiErrors.BadRequest('ids required');
  const uid = currentUserId(session);
  const isAdmin = canEditOthersData(session);

  const selected = db.select().from(items).where(inArray(items.id, ids)).all();
  if (selected.length !== ids.length) throw ApiErrors.NotFound('Item');
  if (!isAdmin && selected.some((it) => it.ownerId !== uid)) throw ApiErrors.Forbidden();

  const sqlite = getRawDb();
  const tx = sqlite.transaction(() => {
    for (const id of ids) {
      db.delete(sales).where(eq(sales.itemId, id)).run();
      db.delete(photos).where(eq(photos.itemId, id)).run();
      db.delete(items).where(eq(items.id, id)).run();
    }
  });
  tx();

  return NextResponse.json({ success: true, count: selected.length });
});