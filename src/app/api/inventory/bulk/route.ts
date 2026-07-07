import { NextRequest, NextResponse } from 'next/server';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canAccessResource, sessionUserId } from '@/lib/auth-utils';
import { bulkStatusSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';
import { isValidTransition, REMOVAL_STATUSES } from '@/lib/constants';

export async function PATCH(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = bulkStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const { ids, status } = parsed.data;
    const found = await db.select().from(items).where(inArray(items.id, ids)).all();

    // Verify all items exist and are owned by the user (or admin).
    for (const item of found) {
      if (!canAccessResource(item.ownerId, session, 'write')) throw ApiErrors.Forbidden();
      if (!isValidTransition(item.status, status)) {
        throw ApiErrors.BadRequest(`Invalid status transition for item ${item.id}: ${item.status} → ${status}`);
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const updateData: Record<string, unknown> = { status, updatedAt: now };
    if (REMOVAL_STATUSES.includes(status)) updateData.removalDate = now;
    if (status === 'available') updateData.removalDate = null;
    // No $0 sale creation for donated/discarded.

    db.update(items).set(updateData).where(inArray(items.id, ids)).run();

    return NextResponse.json({ success: true, updated: ids.length });
  })(req, { params: Promise.resolve({}) });
}

export async function DELETE(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const idsParam = req.nextUrl.searchParams.get('ids');
    if (!idsParam) throw ApiErrors.BadRequest('ids parameter required');
    const ids = idsParam.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) throw ApiErrors.BadRequest('No valid ids provided');

    const found = await db.select().from(items).where(inArray(items.id, ids)).all();
    for (const item of found) {
      if (!canAccessResource(item.ownerId, session, 'write')) throw ApiErrors.Forbidden();
    }

    db.delete(items).where(inArray(items.id, ids)).run();
    return NextResponse.json({ success: true, deleted: ids.length });
  })(req, { params: Promise.resolve({}) });
}
