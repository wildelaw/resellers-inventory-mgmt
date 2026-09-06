import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, readJsonBody } from '@/lib/api-utils';
import { canViewAllData, canEditOthersData, sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { updateMileageSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';

async function getEntryOr404(id: number) {
  const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, id) });
  if (!entry) throw ApiErrors.NotFound('Mileage entry');
  return entry;
}

// GET /api/mileage/:id — owner, admin, or canViewAll
export const GET = withAuth(async (req, ctx, session) => {
  const { id } = await ctx!.params;
  const entry = await getEntryOr404(Number(id));

  if (entry.ownerId !== sessionUserId(session) && !canViewAllData(session)) {
    throw ApiErrors.Forbidden();
  }

  return NextResponse.json(entry);
});

// PUT /api/mileage/:id — owner or admin
export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx!.params;
  const entryId = Number(id);
  const entry = await getEntryOr404(entryId);

  if (entry.ownerId !== sessionUserId(session) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const body = await readJsonBody(req);
  const validation = updateMileageSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 }
    );
  }

  const updated = await db.update(mileage).set({
    ...validation.data,
    updatedAt: new Date(),
  }).where(eq(mileage.id, entryId)).returning();

  return NextResponse.json(updated[0]);
});

// DELETE /api/mileage/:id — owner or admin
export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx!.params;
  const entryId = Number(id);
  const entry = await getEntryOr404(entryId);

  if (entry.ownerId !== sessionUserId(session) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  await db.delete(mileage).where(eq(mileage.id, entryId));
  return NextResponse.json({ success: true });
});