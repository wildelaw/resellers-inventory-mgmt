import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canEditOthersData } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { updateMileageSchema } from '@/lib/validations';
import { eq } from 'drizzle-orm';

export const GET = withAuth(async (req, ctx, session) => {
  const { id } = await ctx.params;
  const entryId = parseInt(id);

  const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, entryId) });
  if (!entry) return NextResponse.json({ error: 'Mileage entry not found' }, { status: 404 });

  if (entry.ownerId !== parseInt(session.user.id) && session.user.role !== 'admin' && !(session.user.canViewAll)) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  return NextResponse.json(entry);
});

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const entryId = parseInt(id);

  const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, entryId) });
  if (!entry) return NextResponse.json({ error: 'Mileage entry not found' }, { status: 404 });
  if (entry.ownerId !== parseInt(session.user.id) && !canEditOthersData(session)) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const body = await req.json();
  const validation = updateMileageSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
      { status: 400 }
    );
  }

  const updateData: any = { ...validation.data, updatedAt: new Date() };
  if (validation.data.date) updateData.date = new Date(validation.data.date);

  const updated = await db.update(mileage).set(updateData).where(eq(mileage.id, entryId)).returning() as any[];
  return NextResponse.json(updated[0]);
});

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const entryId = parseInt(id);

  const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, entryId) });
  if (!entry) return NextResponse.json({ error: 'Mileage entry not found' }, { status: 404 });
  if (entry.ownerId !== parseInt(session.user.id) && !canEditOthersData(session)) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  await db.delete(mileage).where(eq(mileage.id, entryId));
  return NextResponse.json({ success: true });
});