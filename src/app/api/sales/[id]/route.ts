import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { sales, items } from '@/lib/schema';
import { updateSaleSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { canAccessResource } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';

export const GET = withAuth(async (_req, ctx, session) => {
  const { id } = await ctx.params;
  const sale = await db.select().from(sales).where(eq(sales.id, Number(id))).get();

  if (!sale) {
    throw ApiErrors.NotFound('Sale');
  }

  if (!canAccessResource(sale.soldBy, Number(session.user.id), session, 'read')) {
    throw ApiErrors.Forbidden();
  }

  return NextResponse.json(sale);
}, { requireAdmin: false });

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const sale = await db.select().from(sales).where(eq(sales.id, Number(id))).get();

  if (!sale) {
    throw ApiErrors.NotFound('Sale');
  }

  if (!canAccessResource(sale.soldBy, Number(session.user.id), session, 'write')) {
    throw ApiErrors.Forbidden();
  }

  const body = await req.json();
  const parsed = updateSaleSchema.parse(body);

  const result = await db.update(sales)
    .set({ ...parsed })
    .where(eq(sales.id, Number(id)))
    .returning().get();

  return NextResponse.json(result);
}, { requireAdmin: false });

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const sale = await db.select().from(sales).where(eq(sales.id, Number(id))).get();

  if (!sale) {
    throw ApiErrors.NotFound('Sale');
  }

  if (!canAccessResource(sale.soldBy, Number(session.user.id), session, 'write')) {
    throw ApiErrors.Forbidden();
  }

  // Revert item status to 'available' if sale was linked to an item
  if (sale.itemId) {
    const now = Math.floor(Date.now() / 1000);
    await db.update(items)
      .set({ status: 'available', removalDate: null, updatedAt: now })
      .where(eq(items.id, sale.itemId))
      .run();
  }

  await db.delete(sales).where(eq(sales.id, Number(id))).run();

  return NextResponse.json({ success: true });
}, { requireAdmin: false });