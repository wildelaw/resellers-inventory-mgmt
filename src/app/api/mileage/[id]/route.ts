import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { sessionUserId } from '@/lib/auth-utils';
import { updateMileageSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (_req, ctx, session) => {
    const { id } = await ctx.params;
    const mid = Number(id);
    if (!Number.isInteger(mid) || mid <= 0) throw ApiErrors.BadRequest('Invalid id');
    const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, mid) });
    if (!entry) throw ApiErrors.NotFound('Mileage entry');
    if (entry.ownerId !== sessionUserId(session) && session.user.role !== 'admin' && !(session.user as { canViewAll: boolean }).canViewAll) {
      throw ApiErrors.Forbidden();
    }
    return NextResponse.json(entry);
  })(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await ctx.params;
    const mid = Number(id);
    if (!Number.isInteger(mid) || mid <= 0) throw ApiErrors.BadRequest('Invalid id');
    const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, mid) });
    if (!entry) throw ApiErrors.NotFound('Mileage entry');
    if (entry.ownerId !== sessionUserId(session) && session.user.role !== 'admin') throw ApiErrors.Forbidden();

    const body = await req.json();
    const parsed = updateMileageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const updated = db.update(mileage).set({ ...parsed.data, updatedAt: now }).where(eq(mileage.id, mid)).returning();
    return NextResponse.json(updated[0]);
  })(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await ctx.params;
    const mid = Number(id);
    if (!Number.isInteger(mid) || mid <= 0) throw ApiErrors.BadRequest('Invalid id');
    const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, mid) });
    if (!entry) throw ApiErrors.NotFound('Mileage entry');
    if (entry.ownerId !== sessionUserId(session) && session.user.role !== 'admin') throw ApiErrors.Forbidden();

    db.delete(mileage).where(eq(mileage.id, mid)).run();
    return NextResponse.json({ success: true });
  })(req, ctx);
}
