import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { updateSaleSchema } from '@/lib/validations';
import { canViewAllData, canEditOthersData } from '@/lib/auth-utils';
import { ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';
import { nowTimestamp, toTimestamp } from '@/lib/utils';
import { getRawDb } from '@/lib/db';
import type { Session } from 'next-auth';

export const GET = withAuth(async (_req: NextRequest, ctx, session: Session) => {
  const { id } = await ctx.params;
  const saleId = parseInt(id, 10);
  if (isNaN(saleId)) throw ApiErrors.BadRequest('Invalid sale ID');

  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
    with: { item: true, seller: true },
  });
  if (!sale) throw ApiErrors.NotFound('Sale');

  if (sale.soldBy !== parseInt(session.user.id, 10) && !canViewAllData(session)) {
    throw ApiErrors.Forbidden();
  }

  return NextResponse.json(sale);
});

export const PUT = withAuth(async (req: NextRequest, ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const saleId = parseInt(id, 10);
  if (isNaN(saleId)) throw ApiErrors.BadRequest('Invalid sale ID');

  const sale = await db.query.sales.findFirst({ where: eq(sales.id, saleId) });
  if (!sale) throw ApiErrors.NotFound('Sale');

  if (sale.soldBy !== parseInt(session.user.id, 10) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const body = await req.json();
  const validation = updateSaleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 },
    );
  }

  const data = validation.data;
  const update: Record<string, unknown> = {};

  if (data.soldDate !== undefined) update.soldDate = toTimestamp(data.soldDate as string | number | Date);
  if (data.soldPrice !== undefined) update.soldPrice = data.soldPrice;
  if (data.shippingCost !== undefined) update.shippingCost = data.shippingCost;
  if (data.shippingCollected !== undefined) update.shippingCollected = data.shippingCollected;
  if (data.platform !== undefined) update.platform = data.platform;
  if (data.salesTax !== undefined) update.salesTax = data.salesTax;
  if (data.platformFees !== undefined) update.platformFees = data.platformFees;
  if (data.refundReason !== undefined) update.refundReason = data.refundReason;

  if (Object.keys(update).length > 0) {
    await db.update(sales).set(update).where(eq(sales.id, saleId));
  }

  const updated = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
    with: { item: true, seller: true },
  });
  return NextResponse.json(updated);
});

export const DELETE = withAuth(async (req: NextRequest, ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const saleId = parseInt(id, 10);
  if (isNaN(saleId)) throw ApiErrors.BadRequest('Invalid sale ID');

  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
    with: { item: true },
  });
  if (!sale) throw ApiErrors.NotFound('Sale');

  if (sale.soldBy !== parseInt(session.user.id, 10) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const now = nowTimestamp();
  const sqlite = getRawDb();

  sqlite.transaction(() => {
    sqlite.prepare('DELETE FROM sales WHERE id = ?').run(saleId);
    // Revert item status to available if currently sold or returned
    if (sale.itemId && sale.item && (sale.item.status === 'sold' || sale.item.status === 'returned')) {
      sqlite.prepare(
        'UPDATE items SET status = ?, removal_date = NULL, updated_at = ? WHERE id = ?',
      ).run('available', now, sale.itemId);
    }
  })();

  return NextResponse.json({ success: true });
});