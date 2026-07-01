import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canAccessResource } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, photos, sales } from '@/lib/schema';
import { updateItemSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { isValidTransition } from '@/lib/constants';
import { eq } from 'drizzle-orm';

/**
 * GET /api/inventory/[id]
 * Get a single item with photos and sales
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      throw ApiErrors.BadRequest('Invalid item ID');
    }

    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
      with: {
        photos: true,
        sales: true,
        owner: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!item) {
      throw ApiErrors.NotFound('Item');
    }

    // Check access
    if (!canAccessResource(item.ownerId, session.user.id, session, 'read')) {
      throw ApiErrors.Forbidden();
    }

    return NextResponse.json(item);
  })(req, { params });
}

/**
 * PUT /api/inventory/[id]
 * Update an item
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      throw ApiErrors.BadRequest('Invalid item ID');
    }

    // Get existing item
    const existingItem = await db.query.items.findFirst({
      where: eq(items.id, itemId),
    });

    if (!existingItem) {
      throw ApiErrors.NotFound('Item');
    }

    // Check write access
    if (!canAccessResource(existingItem.ownerId, session.user.id, session, 'write')) {
      throw ApiErrors.Forbidden();
    }

    const body = await req.json();
    const validation = updateItemSchema.safeParse(body);

    if (!validation.success) {
      throw ApiErrors.ValidationError(
        'Validation failed',
        validation.error.issues.map(i => i.message)
      );
    }

    const updates = validation.data;

    // Validate status transition if status is being changed
    if (updates.status && updates.status !== existingItem.status) {
      if (!isValidTransition(existingItem.status, updates.status)) {
        throw ApiErrors.BadRequest(
          `Invalid status transition from ${existingItem.status} to ${updates.status}`
        );
      }

      // Set removalDate for donated/discarded
      if (updates.status === 'donated' || updates.status === 'discarded') {
        (updates as any).removalDate = new Date();
      }

      // Clear removalDate when returning to available
      if (existingItem.status === 'returned' && updates.status === 'available') {
        (updates as any).removalDate = null;
      }
    }

    const [updatedItem] = await db
      .update(items)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(items.id, itemId))
      .returning();

    return NextResponse.json(updatedItem);
  })(req, { params });
}

/**
 * DELETE /api/inventory/[id]
 * Delete an item (cascades to photos and sales)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      throw ApiErrors.BadRequest('Invalid item ID');
    }

    // Get existing item
    const existingItem = await db.query.items.findFirst({
      where: eq(items.id, itemId),
    });

    if (!existingItem) {
      throw ApiErrors.NotFound('Item');
    }

    // Check write access
    if (!canAccessResource(existingItem.ownerId, session.user.id, session, 'write')) {
      throw ApiErrors.Forbidden();
    }

    // Delete item (cascades to photos via ON DELETE CASCADE)
    await db.delete(items).where(eq(items.id, itemId));

    return NextResponse.json({ success: true });
  })(req, { params });
}
