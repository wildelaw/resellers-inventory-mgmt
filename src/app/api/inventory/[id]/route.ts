import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, readJsonBody } from '@/lib/api-utils';
import { canViewAllData, canEditOthersData, sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, sales, photos } from '@/lib/schema';
import { updateItemSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { isValidTransition } from '@/lib/constants';
import { statusSideEffects } from '@/lib/status-effects';

type Ctx = { params: Promise<{ id: string }> };

async function getItemOr404(id: number) {
  const item = await db.query.items.findFirst({
    where: eq(items.id, id),
    with: { photos: true, sales: true },
  });
  if (!item) throw ApiErrors.NotFound('Item');
  return item;
}

// GET /api/inventory/:id — owner, admin, or canViewAll
export const GET = withAuth(async (req, ctx, session) => {
  const { id } = await ctx!.params;
  const itemId = Number(id);
  const item = await getItemOr404(itemId);

  const isOwner = item.ownerId === sessionUserId(session);
  if (!isOwner && !canViewAllData(session)) throw ApiErrors.Forbidden();

  return NextResponse.json(item);
});

// PUT /api/inventory/:id — owner or admin; validates status transitions
export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx!.params;
  const itemId = Number(id);
  const item = await getItemOr404(itemId);

  if (item.ownerId !== sessionUserId(session) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const body = await readJsonBody(req);
  const validation = updateItemSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 }
    );
  }

  const data = { ...validation.data };

  // Validate status transition
  let effects = {};
  if (data.status && data.status !== item.status) {
    if (!isValidTransition(item.status, data.status)) {
      throw ApiErrors.BadRequest(`Invalid status transition: ${item.status} → ${data.status}`);
    }
    // No $0 sale records are created for donated/discarded — removalDate only
    effects = statusSideEffects(data.status);
  }

  const updated = await db.update(items).set({
    ...data,
    ...effects,
    updatedAt: new Date(),
  }).where(eq(items.id, itemId)).returning();

  return NextResponse.json(updated[0]);
});

// DELETE /api/inventory/:id — owner or admin; cascading photos/sales
export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx!.params;
  const itemId = Number(id);
  const item = await getItemOr404(itemId);

  if (item.ownerId !== sessionUserId(session) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  // sales.itemId has ON DELETE CASCADE; photos deleted explicitly for clarity
  db.transaction((tx) => {
    tx.delete(photos).where(eq(photos.itemId, itemId)).run();
    tx.delete(sales).where(eq(sales.itemId, itemId)).run();
    tx.delete(items).where(eq(items.id, itemId)).run();
    return null;
  });

  return NextResponse.json({ success: true });
});