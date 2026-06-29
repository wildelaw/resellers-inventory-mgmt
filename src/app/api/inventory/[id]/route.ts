import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { updateItemSchema } from '@/lib/validations';
import { ApiErrors, ApiError } from '@/lib/api-errors';
import { canAccessResource } from '@/lib/auth-utils';
import { isValidTransition, removalDateForTransition } from '@/lib/constants';
import { toTimestamp } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function getItem(id: number) {
  return db.query.items.findFirst({
    where: eq(items.id, id),
    with: { photos: true, sales: true, owner: true },
  });
}

// GET /api/inventory/[id]
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();
    const item = await getItem(id);
    if (!item) return ApiErrors.NotFound('Item').toResponse();
    if (!canAccessResource(item.ownerId, session.user.id, session, 'read')) {
      return ApiErrors.Forbidden().toResponse();
    }
    return NextResponse.json(item);
  })(req, ctx);
}

// PUT /api/inventory/[id]
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();

    const existing = await getItem(id);
    if (!existing) return ApiErrors.NotFound('Item').toResponse();
    if (!canAccessResource(existing.ownerId, session.user.id, session, 'write')) {
      return ApiErrors.Forbidden().toResponse();
    }

    const body = await req.json();
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }
    const data = parsed.data;

    // Status transition validation
    let nextStatus = existing.status as typeof existing.status;
    if (data.status && data.status !== existing.status) {
      if (!isValidTransition(existing.status as any, data.status as any)) {
        return ApiErrors.BadRequest(`Invalid status transition: ${existing.status} → ${data.status}`).toResponse();
      }
      nextStatus = data.status as any;
    }

    // removalDate side effect
    let nextRemovalDate: number | null | undefined = existing.removalDate;
    if (data.status && data.status !== existing.status) {
      const effect = removalDateForTransition(data.status as any, existing.status as any);
      if (effect !== undefined) nextRemovalDate = effect;
    }
    if (data.removalDate !== undefined) {
      nextRemovalDate = data.removalDate === null ? null : toTimestamp(data.removalDate);
    }

    const update: Record<string, unknown> = { updatedAt: Date.now() };
    if (data.name !== undefined) update.name = data.name;
    if (data.description !== undefined) update.description = data.description;
    if (data.purchaseDate !== undefined) {
      const ts = toTimestamp(data.purchaseDate);
      if (ts !== null) update.purchaseDate = ts;
    }
    if (data.purchasePrice !== undefined) update.purchasePrice = data.purchasePrice;
    if (data.purchaseLocation !== undefined) update.purchaseLocation = data.purchaseLocation;
    if (data.category !== undefined) update.category = data.category;
    if (data.notes !== undefined) update.notes = data.notes;
    if (data.metadata !== undefined) {
      update.metadata = data.metadata === null || data.metadata === undefined
        ? null
        : typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata);
    }
    if (data.status !== undefined) update.status = nextStatus;
    if (nextRemovalDate !== undefined) update.removalDate = nextRemovalDate;

    const updated = db.update(items).set(update).where(eq(items.id, id)).returning().get();
    return NextResponse.json(updated);
  })(req, ctx);
}

// DELETE /api/inventory/[id]
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();

    const existing = await getItem(id);
    if (!existing) return ApiErrors.NotFound('Item').toResponse();
    if (!canAccessResource(existing.ownerId, session.user.id, session, 'write')) {
      return ApiErrors.Forbidden().toResponse();
    }

    // Cascading delete handled by FK on photos; sales must be deleted explicitly
    db.delete(items).where(eq(items.id, id)).run();
    return NextResponse.json({ success: true });
  })(req, ctx);
}