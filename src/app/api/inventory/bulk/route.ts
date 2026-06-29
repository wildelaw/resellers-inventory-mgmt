import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { inArray, eq, and } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { bulkStatusSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { canAccessResource } from '@/lib/auth-utils';
import { isValidTransition, removalDateForTransition } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// PATCH /api/inventory/bulk — bulk status change
export async function PATCH(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = bulkStatusSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }
    const { ids, status } = parsed.data;

    // Fetch all items, verify ownership for each
    const rows = db.select().from(items).where(inArray(items.id, ids)).all();
    if (rows.length !== ids.length) {
      return ApiErrors.NotFound('One or more items not found').toResponse();
    }
    for (const row of rows) {
      if (!canAccessResource(row.ownerId, session.user.id, session, 'write')) {
        return ApiErrors.Forbidden('Not allowed to modify one or more items').toResponse();
      }
      if (!isValidTransition(row.status as any, status)) {
        return ApiErrors.BadRequest(`Invalid status transition for item ${row.id}: ${row.status} → ${status}`).toResponse();
      }
    }

    const now = Date.now();
    db.transaction(() => {
      for (const row of rows) {
        const update: Record<string, unknown> = { status, updatedAt: now };
        const removalEffect = removalDateForTransition(status as any, row.status as any);
        if (removalEffect !== undefined) update.removalDate = removalEffect;
        db.update(items).set(update).where(eq(items.id, row.id)).run();
      }
    });

    return NextResponse.json({ success: true, count: rows.length });
  })(req, { params: Promise.resolve({}) });
}

// DELETE /api/inventory/bulk?ids=1,2,3
export async function DELETE(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const idsParam = req.nextUrl.searchParams.get('ids') ?? '';
    const ids = idsParam
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) {
      return ApiErrors.BadRequest('Missing or invalid ids').toResponse();
    }

    const rows = db.select().from(items).where(inArray(items.id, ids)).all();
    if (rows.length !== ids.length) {
      return ApiErrors.NotFound('One or more items not found').toResponse();
    }
    for (const row of rows) {
      if (!canAccessResource(row.ownerId, session.user.id, session, 'write')) {
        return ApiErrors.Forbidden('Not allowed to delete one or more items').toResponse();
      }
    }

    db.transaction(() => {
      for (const id of ids) {
        db.delete(items).where(eq(items.id, id)).run();
      }
    });

    return NextResponse.json({ success: true, count: rows.length });
  })(req, { params: Promise.resolve({}) });
}