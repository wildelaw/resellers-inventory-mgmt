import { NextResponse, type NextRequest } from 'next/server';
import { inArray, eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, readJsonBody } from '@/lib/api-utils';
import { sessionUserId, canEditOthersData } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, sales, photos } from '@/lib/schema';
import { bulkStatusSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { isValidTransition } from '@/lib/constants';
import { statusSideEffects } from '@/lib/status-effects';

// PATCH /api/inventory/bulk — status change for multiple items (owner of all)
export const PATCH = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await readJsonBody(req);
  const validation = bulkStatusSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 }
    );
  }

  const { ids, status } = validation.data;
  const userId = sessionUserId(session);
  const isAdmin = canEditOthersData(session);

  const rows = await db.select().from(items).where(inArray(items.id, ids));
  if (rows.length !== ids.length) throw ApiErrors.NotFound('One or more items');

  // Caller must own every item (or be admin)
  if (!isAdmin && rows.some((r) => r.ownerId !== userId)) {
    throw ApiErrors.Forbidden();
  }

  // Validate every transition before applying any change
  for (const row of rows) {
    if (row.status !== status && !isValidTransition(row.status, status)) {
      throw ApiErrors.BadRequest(`Invalid status transition: ${row.status} → ${status} (item ${row.id})`);
    }
  }

  const effects = statusSideEffects(status);
  const now = new Date();

  db.transaction((tx) => {
    for (const row of rows) {
      if (row.status === status) continue;
      tx.update(items).set({
        status,
        ...effects,
        updatedAt: now,
      }).where(eq(items.id, row.id)).run();
    }
    return null;
  });

  // Donated/discarded set removalDate only — no $0 sale records are created
  const updated = await db.select().from(items).where(inArray(items.id, ids));
  return NextResponse.json({ updated });
});

// DELETE /api/inventory/bulk?ids=1,2,3 — owner of all items
export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const idsParam = req.nextUrl.searchParams.get('ids');
  if (!idsParam) throw ApiErrors.BadRequest('ids query parameter is required');
  const ids = idsParam.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) throw ApiErrors.BadRequest('ids must be a comma-separated list of item ids');

  const userId = sessionUserId(session);
  const isAdmin = canEditOthersData(session);

  const rows = await db.select().from(items).where(inArray(items.id, ids));
  if (rows.length !== ids.length) throw ApiErrors.NotFound('One or more items');
  if (!isAdmin && rows.some((r) => r.ownerId !== userId)) {
    throw ApiErrors.Forbidden();
  }

  db.transaction((tx) => {
    tx.delete(photos).where(inArray(photos.itemId, ids)).run();
    tx.delete(sales).where(inArray(sales.itemId, ids)).run();
    tx.delete(items).where(inArray(items.id, ids)).run();
    return null;
  });

  return NextResponse.json({ success: true, deleted: ids.length });
});