import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mileage, nowTs } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canEditOthersData, currentUserId } from '@/lib/auth-utils';
import { updateMileageSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';

export const GET = withAuth(async (_req, ctx, session) => {
  const { id } = await ctx.params;
  const mid = parseInt(id, 10);
  if (!Number.isFinite(mid) || mid <= 0) throw ApiErrors.BadRequest('Invalid id');

  const entry = db.query.mileage.findFirst({ where: eq(mileage.id, mid) }).sync();
  if (!entry) throw ApiErrors.NotFound('Mileage entry');

  const uid = currentUserId(session);
  const viewAll = session.user.role === 'admin' || session.user.canViewAll === true;
  if (entry.ownerId !== uid && !viewAll) throw ApiErrors.Forbidden();
  return NextResponse.json(entry);
});

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const mid = parseInt(id, 10);
  if (!Number.isFinite(mid) || mid <= 0) throw ApiErrors.BadRequest('Invalid id');

  const existing = db.query.mileage.findFirst({ where: eq(mileage.id, mid) }).sync();
  if (!existing) throw ApiErrors.NotFound('Mileage entry');

  const uid = currentUserId(session);
  if (existing.ownerId !== uid && !canEditOthersData(session)) throw ApiErrors.Forbidden();

  const body = await req.json();
  const parsed = updateMileageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const update: Record<string, unknown> = { updatedAt: nowTs() };
  if (data.date !== undefined && data.date !== null) update.date = data.date;
  if (data.miles !== undefined) update.miles = data.miles;
  if (data.fromLocation !== undefined) update.fromLocation = data.fromLocation;
  if (data.toLocation !== undefined) update.toLocation = data.toLocation;
  if (data.address !== undefined) update.address = data.address;
  if (data.vehicle !== undefined) update.vehicle = data.vehicle;
  if (data.purpose !== undefined) update.purpose = data.purpose;

  const [updated] = db.update(mileage).set(update).where(eq(mileage.id, mid)).returning().all();
  return NextResponse.json(updated);
});

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const mid = parseInt(id, 10);
  if (!Number.isFinite(mid) || mid <= 0) throw ApiErrors.BadRequest('Invalid id');

  const existing = db.query.mileage.findFirst({ where: eq(mileage.id, mid) }).sync();
  if (!existing) throw ApiErrors.NotFound('Mileage entry');

  const uid = currentUserId(session);
  if (existing.ownerId !== uid && !canEditOthersData(session)) throw ApiErrors.Forbidden();

  db.delete(mileage).where(eq(mileage.id, mid)).run();
  return NextResponse.json({ success: true });
});