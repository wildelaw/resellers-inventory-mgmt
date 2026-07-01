import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canAccessResource } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { updateMileageSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';

/**
 * GET /api/mileage/[id]
 * Get a single mileage entry
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const { id } = await params;
    const entryId = parseInt(id);

    if (isNaN(entryId)) {
      throw ApiErrors.BadRequest('Invalid mileage ID');
    }

    const entry = await db.query.mileage.findFirst({
      where: eq(mileage.id, entryId),
    });

    if (!entry) {
      throw ApiErrors.NotFound('Mileage entry');
    }

    // Check access
    if (!canAccessResource(entry.ownerId, session.user.id, session, 'read')) {
      throw ApiErrors.Forbidden();
    }

    return NextResponse.json(entry);
  })(req, { params });
}

/**
 * PUT /api/mileage/[id]
 * Update a mileage entry
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await params;
    const entryId = parseInt(id);

    if (isNaN(entryId)) {
      throw ApiErrors.BadRequest('Invalid mileage ID');
    }

    const existingEntry = await db.query.mileage.findFirst({
      where: eq(mileage.id, entryId),
    });

    if (!existingEntry) {
      throw ApiErrors.NotFound('Mileage entry');
    }

    // Check write access
    if (!canAccessResource(existingEntry.ownerId, session.user.id, session, 'write')) {
      throw ApiErrors.Forbidden();
    }

    const body = await req.json();
    const validation = updateMileageSchema.safeParse(body);

    if (!validation.success) {
      throw ApiErrors.ValidationError(
        'Validation failed',
        validation.error.issues.map(i => i.message)
      );
    }

    const [updatedEntry] = await db
      .update(mileage)
      .set({
        ...validation.data,
        updatedAt: new Date(),
      })
      .where(eq(mileage.id, entryId))
      .returning();

    return NextResponse.json(updatedEntry);
  })(req, { params });
}

/**
 * DELETE /api/mileage/[id]
 * Delete a mileage entry
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await params;
    const entryId = parseInt(id);

    if (isNaN(entryId)) {
      throw ApiErrors.BadRequest('Invalid mileage ID');
    }

    const existingEntry = await db.query.mileage.findFirst({
      where: eq(mileage.id, entryId),
    });

    if (!existingEntry) {
      throw ApiErrors.NotFound('Mileage entry');
    }

    // Check write access
    if (!canAccessResource(existingEntry.ownerId, session.user.id, session, 'write')) {
      throw ApiErrors.Forbidden();
    }

    await db.delete(mileage).where(eq(mileage.id, entryId));

    return NextResponse.json({ success: true });
  })(req, { params });
}
