import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { items, photos, sales } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canAccessResource, sessionUserId, canEditOthersData } from '@/lib/auth-utils';
import { updateItemSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';
import { isValidTransition, REMOVAL_STATUSES } from '@/lib/constants';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (_req, ctx, session) => {
    const { id } = await ctx.params;
    const itemId = Number(id);
    if (!Number.isInteger(itemId) || itemId <= 0) throw ApiErrors.BadRequest('Invalid id');

    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
      with: { photos: true, sales: true },
    });
    if (!item) throw ApiErrors.NotFound('Item');

    if (!canAccessResource(item.ownerId, session, 'read')) throw ApiErrors.Forbidden();
    return NextResponse.json(item);
  })(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await ctx.params;
    const itemId = Number(id);
    if (!Number.isInteger(itemId) || itemId <= 0) throw ApiErrors.BadRequest('Invalid id');

    const existing = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!existing) throw ApiErrors.NotFound('Item');
    if (!canAccessResource(existing.ownerId, session, 'write')) throw ApiErrors.Forbidden();

    const body = await req.json();
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const data = { ...parsed.data };
    const now = Math.floor(Date.now() / 1000);

    // Status transition validation + side effects.
    if (data.status && data.status !== existing.status) {
      if (!isValidTransition(existing.status, data.status)) {
        throw ApiErrors.BadRequest(`Invalid status transition: ${existing.status} → ${data.status}`);
      }
      if (REMOVAL_STATUSES.includes(data.status)) {
        data.removalDate = now; // donated/discarded → set removalDate (no $0 sale)
      }
      if (existing.status === 'returned' && data.status === 'available') {
        data.removalDate = null; // returned → available → clear removalDate
      }
      if (data.status === 'sold' && !data.removalDate) {
        // When sold via item edit, set removalDate to now if not provided.
        data.removalDate = now;
      }
    }

    const updated = db
      .update(items)
      .set({ ...data, updatedAt: now })
      .where(eq(items.id, itemId))
      .returning();

    return NextResponse.json(updated[0]);
  })(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await ctx.params;
    const itemId = Number(id);
    if (!Number.isInteger(itemId) || itemId <= 0) throw ApiErrors.BadRequest('Invalid id');

    const existing = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!existing) throw ApiErrors.NotFound('Item');
    if (!canAccessResource(existing.ownerId, session, 'write')) throw ApiErrors.Forbidden();

    // Hard delete — cascading photos/sales via FK ON DELETE CASCADE.
    db.delete(items).where(eq(items.id, itemId)).run();
    return NextResponse.json({ success: true });
  })(req, ctx);
}
