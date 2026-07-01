import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { updateMileageSchema } from '@/lib/validations';
import { canEditOthersData } from '@/lib/auth-utils';
import { ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';
import { nowTimestamp, toTimestamp } from '@/lib/utils';
import type { Session } from 'next-auth';

export const GET = withAuth(async (_req: NextRequest, ctx, session: Session) => {
  const { id } = await ctx.params;
  const entryId = parseInt(id, 10);
  if (isNaN(entryId)) throw ApiErrors.BadRequest('Invalid mileage ID');

  const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, entryId) });
  if (!entry) throw ApiErrors.NotFound('Mileage entry');

  if (entry.ownerId !== parseInt(session.user.id, 10) && session.user.role !== 'admin' && session.user.canViewAll !== true) {
    throw ApiErrors.Forbidden();
  }

  return NextResponse.json(entry);
});

export const PUT = withAuth(async (req: NextRequest, ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const entryId = parseInt(id, 10);
  if (isNaN(entryId)) throw ApiErrors.BadRequest('Invalid mileage ID');

  const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, entryId) });
  if (!entry) throw ApiErrors.NotFound('Mileage entry');

  if (entry.ownerId !== parseInt(session.user.id, 10) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const body = await req.json();
  const validation = updateMileageSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 },
    );
  }

  const data = validation.data;
  const update: Record<string, unknown> = { updatedAt: nowTimestamp() };
  if (data.date !== undefined) update.date = toTimestamp(data.date);
  if (data.miles !== undefined) update.miles = data.miles;
  if (data.fromLocation !== undefined) update.fromLocation = data.fromLocation;
  if (data.toLocation !== undefined) update.toLocation = data.toLocation;
  if (data.address !== undefined) update.address = data.address;
  if (data.vehicle !== undefined) update.vehicle = data.vehicle;
  if (data.purpose !== undefined) update.purpose = data.purpose;

  const updated = await db.update(mileage).set(update).where(eq(mileage.id, entryId)).returning();
  return NextResponse.json(updated[0]);
});

export const DELETE = withAuth(async (req: NextRequest, ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const entryId = parseInt(id, 10);
  if (isNaN(entryId)) throw ApiErrors.BadRequest('Invalid mileage ID');

  const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, entryId) });
  if (!entry) throw ApiErrors.NotFound('Mileage entry');

  if (entry.ownerId !== parseInt(session.user.id, 10) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  await db.delete(mileage).where(eq(mileage.id, entryId));
  return NextResponse.json({ success: true });
});