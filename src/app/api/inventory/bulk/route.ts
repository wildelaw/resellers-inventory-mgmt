import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canAccessResource } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { bulkUpdateStatusSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { isValidTransition } from '@/lib/constants';
import { eq, inArray } from 'drizzle-orm';

/**
 * PATCH /api/inventory/bulk
 * Bulk update item statuses
 */
export async function PATCH(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const validation = bulkUpdateStatusSchema.safeParse(body);

    if (!validation.success) {
      throw ApiErrors.ValidationError(
        'Validation failed',
        validation.error.issues.map(i => i.message)
      );
    }

    const { ids, status } = validation.data;

    // Get all items to check ownership and current status
    const itemsList = await db.query.items.findMany({
      where: inArray(items.id, ids),
    });

    if (itemsList.length === 0) {
      throw ApiErrors.NotFound('No items found');
    }

    if (itemsList.length !== ids.length) {
      throw ApiErrors.BadRequest('Some items not found');
    }

    // Check ownership for all items
    for (const item of itemsList) {
      if (!canAccessResource(item.ownerId, session.user.id, session, 'write')) {
        throw ApiErrors.Forbidden(`You do not have permission to modify item ${item.id}`);
      }
    }

    // Validate all status transitions
    const invalidTransitions: string[] = [];
    for (const item of itemsList) {
      if (!isValidTransition(item.status, status)) {
        invalidTransitions.push(
          `Item ${item.id}: ${item.status} → ${status}`
        );
      }
    }

    if (invalidTransitions.length > 0) {
      throw ApiErrors.BadRequest(
        `Invalid status transitions: ${invalidTransitions.join(', ')}`
      );
    }

    // Prepare update data
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    // Set removalDate for donated/discarded
    if (status === 'donated' || status === 'discarded') {
      updateData.removalDate = new Date();
    }

    // Update all items
    await db
      .update(items)
      .set(updateData)
      .where(inArray(items.id, ids));

    return NextResponse.json({
      message: `Updated ${ids.length} item(s)`,
      count: ids.length,
    });
  })(req);
}

/**
 * DELETE /api/inventory/bulk
 * Bulk delete items
 */
export async function DELETE(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      throw ApiErrors.BadRequest('Missing ids parameter');
    }

    const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (ids.length === 0) {
      throw ApiErrors.BadRequest('No valid item IDs provided');
    }

    // Get all items to check ownership
    const itemsList = await db.query.items.findMany({
      where: inArray(items.id, ids),
    });

    if (itemsList.length === 0) {
      throw ApiErrors.NotFound('No items found');
    }

    // Check ownership for all items
    for (const item of itemsList) {
      if (!canAccessResource(item.ownerId, session.user.id, session, 'write')) {
        throw ApiErrors.Forbidden(`You do not have permission to delete item ${item.id}`);
      }
    }

    // Delete all items
    await db.delete(items).where(inArray(items.id, ids));

    return NextResponse.json({
      message: `Deleted ${itemsList.length} item(s)`,
      count: itemsList.length,
    });
  })(req);
}
