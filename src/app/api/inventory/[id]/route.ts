import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, photos, sales } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canAccessResource, canEditOthersData } from '@/lib/auth-utils';
import { updateItemSchema } from '@/lib/validations';
import { isValidTransition, ALLOWED_TRANSITIONS, type ItemStatus } from '@/lib/constants';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { nowTimestamp, toTimestamp } from '@/lib/utils';

// GET - Get single item
export async function GET(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    try {
      const { id } = await ctx.params;
      const itemId = Number(id);

      const item = await db.query.items.findFirst({
        where: eq(items.id, itemId),
        with: {
          photos: true,
          sales: true,
          owner: true,
        },
      });

      if (!item) throw ApiErrors.NotFound('Item');

      // RBAC: check access
      if (!canAccessResource(item.ownerId, session, 'read')) {
        throw ApiErrors.Forbidden();
      }

      return NextResponse.json(item);
    } catch (error) {
      return handleApiError(error);
    }
  })(req, ctx);
}

// PUT - Update item
export async function PUT(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const { id } = await ctx.params;
      const itemId = Number(id);

      const item = await db.query.items.findFirst({
        where: eq(items.id, itemId),
      });

      if (!item) throw ApiErrors.NotFound('Item');

      // RBAC: only owner or admin can edit
      if (!canAccessResource(item.ownerId, session, 'write')) {
        throw ApiErrors.Forbidden();
      }

      const body = await req.json();
      const validation = updateItemSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
          { status: 400 }
        );
      }

      const data = validation.data;
      const updateData: Record<string, any> = { updatedAt: nowTimestamp() };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.purchaseDate !== undefined) updateData.purchaseDate = toTimestamp(data.purchaseDate);
      if (data.purchasePrice !== undefined) updateData.purchasePrice = Number(data.purchasePrice);
      if (data.purchaseLocation !== undefined) updateData.purchaseLocation = data.purchaseLocation;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;

      // Handle status transition
      if (data.status !== undefined) {
        const currentStatus = item.status as ItemStatus;
        const newStatus = data.status as ItemStatus;

        if (!isValidTransition(currentStatus, newStatus)) {
          throw ApiErrors.BadRequest(`Invalid status transition from ${currentStatus} to ${newStatus}`);
        }

        updateData.status = newStatus;

        // Set removalDate for donated/discarded
        if (newStatus === 'donated' || newStatus === 'discarded') {
          updateData.removalDate = nowTimestamp();
        }

        // Clear removalDate when returning to available
        if (currentStatus === 'returned' && newStatus === 'available') {
          updateData.removalDate = null;
        }

        // Set removalDate when sold
        if (newStatus === 'sold') {
          updateData.removalDate = nowTimestamp();
        }
      }

      const updated = await db.update(items)
        .set(updateData)
        .where(eq(items.id, itemId))
        .returning();

      return NextResponse.json(updated[0]);
    } catch (error) {
      return handleApiError(error);
    }
  })(req, ctx);
}

// DELETE - Delete item
export async function DELETE(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const { id } = await ctx.params;
      const itemId = Number(id);

      const item = await db.query.items.findFirst({
        where: eq(items.id, itemId),
      });

      if (!item) throw ApiErrors.NotFound('Item');

      // RBAC: only owner or admin can delete
      if (!canAccessResource(item.ownerId, session, 'write')) {
        throw ApiErrors.Forbidden();
      }

      // Hard delete with cascading (photos cascade is set in schema, sales need manual delete)
      await db.delete(sales).where(eq(sales.itemId, itemId));
      await db.delete(photos).where(eq(photos.itemId, itemId));
      await db.delete(items).where(eq(items.id, itemId));

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, ctx);
}