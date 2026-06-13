import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { updateMileageSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { canAccessResource } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';

export const GET = withAuth(async (_req, ctx, session) => {
  const { id } = await ctx.params;
  const entry = await db.select().from(mileage).where(eq(mileage.id, Number(id))).get();

  if (!entry) {
    throw ApiErrors.NotFound('Mileage entry');
  }

  if (!canAccessResource(entry.ownerId, Number(session.user.id), session, 'read')) {
    throw ApiErrors.Forbidden();
  }

  return NextResponse.json(entry);
}, { requireAdmin: false });

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const entry = await db.select().from(mileage).where(eq(mileage.id, Number(id))).get();

  if (!entry) {
    throw ApiErrors.NotFound('Mileage entry');
  }

  if (!canAccessResource(entry.ownerId, Number(session.user.id), session, 'write')) {
    throw ApiErrors.Forbidden();
  }

  const body = await req.json();
  const parsed = updateMileageSchema.parse(body);

  const result = await db.update(mileage)
    .set({ ...parsed, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(mileage.id, Number(id)))
    .returning().get();

  return NextResponse.json(result);
}, { requireAdmin: false });

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const entry = await db.select().from(mileage).where(eq(mileage.id, Number(id))).get();

  if (!entry) {
    throw ApiErrors.NotFound('Mileage entry');
  }

  if (!canAccessResource(entry.ownerId, Number(session.user.id), session, 'write')) {
    throw ApiErrors.Forbidden();
  }

  await db.delete(mileage).where(eq(mileage.id, Number(id))).run();

  return NextResponse.json({ success: true });
}, { requireAdmin: false });