import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { updateMileageSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { canAccessResource } from '@/lib/auth-utils';
import { toTimestamp } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function getEntry(id: number) {
  return db.query.mileage.findFirst({ where: eq(mileage.id, id) });
}

// GET /api/mileage/[id]
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();
    const entry = await getEntry(id);
    if (!entry) return ApiErrors.NotFound('Mileage entry').toResponse();
    if (!canAccessResource(entry.ownerId, session.user.id, session, 'read')) {
      return ApiErrors.Forbidden().toResponse();
    }
    return NextResponse.json(entry);
  })(req, ctx);
}

// PUT /api/mileage/[id]
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();

    const existing = await getEntry(id);
    if (!existing) return ApiErrors.NotFound('Mileage entry').toResponse();
    if (!canAccessResource(existing.ownerId, session.user.id, session, 'write')) {
      return ApiErrors.Forbidden().toResponse();
    }

    const body = await req.json();
    const parsed = updateMileageSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }
    const data = parsed.data;

    const update: Record<string, unknown> = { updatedAt: Date.now() };
    if (data.date !== undefined) {
      const ts = toTimestamp(data.date);
      if (ts !== null) update.date = ts;
    }
    if (data.miles !== undefined) update.miles = data.miles;
    if (data.fromLocation !== undefined) update.fromLocation = data.fromLocation;
    if (data.toLocation !== undefined) update.toLocation = data.toLocation;
    if (data.address !== undefined) update.address = data.address;
    if (data.vehicle !== undefined) update.vehicle = data.vehicle;
    if (data.purpose !== undefined) update.purpose = data.purpose;

    const updated = db.update(mileage).set(update).where(eq(mileage.id, id)).returning().get();
    return NextResponse.json(updated);
  })(req, ctx);
}

// DELETE /api/mileage/[id]
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();

    const existing = await getEntry(id);
    if (!existing) return ApiErrors.NotFound('Mileage entry').toResponse();
    if (!canAccessResource(existing.ownerId, session.user.id, session, 'write')) {
      return ApiErrors.Forbidden().toResponse();
    }

    db.delete(mileage).where(eq(mileage.id, id)).run();
    return NextResponse.json({ success: true });
  })(req, ctx);
}