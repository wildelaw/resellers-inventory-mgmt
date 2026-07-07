import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { updateMileageSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { nowTimestamp, toTimestamp } from '@/lib/utils';

// GET - Get single mileage entry
export async function GET(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    try {
      const { id } = await ctx.params;
      const entryId = Number(id);

      const entry = await db.query.mileage.findFirst({
        where: eq(mileage.id, entryId),
      });

      if (!entry) throw ApiErrors.NotFound('Mileage entry');

      // RBAC: owner, admin, or canViewAll
      if (entry.ownerId !== Number(session.user.id) && session.user.role !== 'admin' && !(session.user.canViewAll === true)) {
        throw ApiErrors.Forbidden();
      }

      return NextResponse.json(entry);
    } catch (error) {
      return handleApiError(error);
    }
  })(req, ctx);
}

// PUT - Update mileage entry
export async function PUT(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const { id } = await ctx.params;
      const entryId = Number(id);

      const entry = await db.query.mileage.findFirst({
        where: eq(mileage.id, entryId),
      });

      if (!entry) throw ApiErrors.NotFound('Mileage entry');

      // RBAC: only owner or admin
      if (entry.ownerId !== Number(session.user.id) && session.user.role !== 'admin') {
        throw ApiErrors.Forbidden();
      }

      const body = await req.json();
      const validation = updateMileageSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
          { status: 400 }
        );
      }

      const data = validation.data;
      const updateData: Record<string, any> = { updatedAt: nowTimestamp() };

      if (data.date !== undefined) updateData.date = toTimestamp(data.date);
      if (data.miles !== undefined) updateData.miles = Number(data.miles);
      if (data.fromLocation !== undefined) updateData.fromLocation = data.fromLocation;
      if (data.toLocation !== undefined) updateData.toLocation = data.toLocation;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.vehicle !== undefined) updateData.vehicle = data.vehicle;
      if (data.purpose !== undefined) updateData.purpose = data.purpose;

      const updated = await db.update(mileage)
        .set(updateData)
        .where(eq(mileage.id, entryId))
        .returning();

      return NextResponse.json(updated[0]);
    } catch (error) {
      return handleApiError(error);
    }
  })(req, ctx);
}

// DELETE - Delete mileage entry
export async function DELETE(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const { id } = await ctx.params;
      const entryId = Number(id);

      const entry = await db.query.mileage.findFirst({
        where: eq(mileage.id, entryId),
      });

      if (!entry) throw ApiErrors.NotFound('Mileage entry');

      // RBAC: only owner or admin
      if (entry.ownerId !== Number(session.user.id) && session.user.role !== 'admin') {
        throw ApiErrors.Forbidden();
      }

      await db.delete(mileage).where(eq(mileage.id, entryId));

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, ctx);
}