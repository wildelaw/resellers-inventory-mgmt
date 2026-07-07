import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { eq, inArray } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canAccessResource } from '@/lib/auth-utils';
import { bulkStatusUpdateSchema } from '@/lib/validations';
import { isValidTransition, type ItemStatus } from '@/lib/constants';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { nowTimestamp } from '@/lib/utils';

// PATCH - Bulk status change
export async function PATCH(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const body = await req.json();
      const validation = bulkStatusUpdateSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
          { status: 400 }
        );
      }

      const { ids, status: newStatus } = validation.data;
      const userId = Number(session.user.id);
      const isAdmin = session.user.role === 'admin';

      // Fetch all items
      const targetItems = await db.query.items.findMany({
        where: inArray(items.id, ids),
      });

      if (targetItems.length !== ids.length) {
        throw ApiErrors.NotFound('One or more items not found');
      }

      // Check ownership for all items
      for (const item of targetItems) {
        if (!canAccessResource(item.ownerId, session, 'write')) {
          throw ApiErrors.Forbidden('You do not have permission to modify one or more items');
        }
      }

      // Validate all transitions
      for (const item of targetItems) {
        const currentStatus = item.status as ItemStatus;
        if (!isValidTransition(currentStatus, newStatus as ItemStatus)) {
          throw ApiErrors.BadRequest(`Invalid status transition from ${currentStatus} to ${newStatus} for item "${item.name}"`);
        }
      }

      // Apply updates
      const now = nowTimestamp();
      const updateData: Record<string, any> = {
        status: newStatus,
        updatedAt: now,
      };

      if (newStatus === 'donated' || newStatus === 'discarded' || newStatus === 'sold') {
        updateData.removalDate = now;
      }

      if (newStatus === 'available') {
        updateData.removalDate = null;
      }

      await db.update(items)
        .set(updateData)
        .where(inArray(items.id, ids));

      return NextResponse.json({ success: true, updated: ids.length });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}

// DELETE - Bulk delete
export async function DELETE(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const { searchParams } = new URL(req.url);
      const idsParam = searchParams.get('ids') || '';
      const ids = idsParam.split(',').map(Number).filter(n => !isNaN(n) && n > 0);

      if (ids.length === 0) {
        throw ApiErrors.BadRequest('No item IDs provided');
      }

      // Fetch all items
      const targetItems = await db.query.items.findMany({
        where: inArray(items.id, ids),
      });

      if (targetItems.length !== ids.length) {
        throw ApiErrors.NotFound('One or more items not found');
      }

      // Check ownership for all items
      for (const item of targetItems) {
        if (!canAccessResource(item.ownerId, session, 'write')) {
          throw ApiErrors.Forbidden('You do not have permission to delete one or more items');
        }
      }

      // Delete cascading
      for (const id of ids) {
        await db.delete(items).where(eq(items.id, id));
      }

      return NextResponse.json({ success: true, deleted: ids.length });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}