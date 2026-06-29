import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, getRawDb } from '@/lib/db';
import { sales, items, nowTs } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canViewAllData, canEditOthersData, currentUserId } from '@/lib/auth-utils';
import { updateSaleSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';

export const GET = withAuth(async (_req, ctx, session) => {
  const { id } = await ctx.params;
  const saleId = parseInt(id, 10);
  if (!Number.isFinite(saleId) || saleId <= 0) throw ApiErrors.BadRequest('Invalid id');

  const sale = db.query.sales.findFirst({ where: eq(sales.id, saleId), with: { item: true } }).sync();
  if (!sale) throw ApiErrors.NotFound('Sale');

  const uid = currentUserId(session);
  if (sale.soldBy !== uid && !canViewAllData(session)) throw ApiErrors.Forbidden();
  return NextResponse.json(sale);
});

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const saleId = parseInt(id, 10);
  if (!Number.isFinite(saleId) || saleId <= 0) throw ApiErrors.BadRequest('Invalid id');

  const existing = db.query.sales.findFirst({ where: eq(sales.id, saleId) }).sync();
  if (!existing) throw ApiErrors.NotFound('Sale');

  const uid = currentUserId(session);
  if (existing.soldBy !== uid && !canEditOthersData(session)) throw ApiErrors.Forbidden();

  const body = await req.json();
  const parsed = updateSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const update: Record<string, unknown> = {};
  if (data.soldDate !== undefined && data.soldDate !== null) update.soldDate = data.soldDate;
  if (data.soldPrice !== undefined) update.soldPrice = data.soldPrice;
  if (data.shippingCost !== undefined) update.shippingCost = data.shippingCost;
  if (data.shippingCollected !== undefined) update.shippingCollected = data.shippingCollected;
  if (data.platform !== undefined) update.platform = data.platform;
  if (data.salesTax !== undefined) update.salesTax = data.salesTax;
  if (data.platformFees !== undefined) update.platformFees = data.platformFees;
  if (data.refundReason !== undefined) update.refundReason = data.refundReason;
  if (Object.keys(update).length === 0) {
    return NextResponse.json(existing);
  }

  const [updated] = db.update(sales).set(update).where(eq(sales.id, saleId)).returning().all();
  return NextResponse.json(updated);
});

export const DELETE = withAuth(async (_req, ctx, session) => {
  const originError = validateOriginOrReferer(_req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const saleId = parseInt(id, 10);
  if (!Number.isFinite(saleId) || saleId <= 0) throw ApiErrors.BadRequest('Invalid id');

  const existing = db.query.sales.findFirst({ where: eq(sales.id, saleId) }).sync();
  if (!existing) throw ApiErrors.NotFound('Sale');

  const uid = currentUserId(session);
  if (existing.soldBy !== uid && !canEditOthersData(session)) throw ApiErrors.Forbidden();

  const ts = nowTs();
  const sqlite = getRawDb();
  const tx = sqlite.transaction(() => {
    db.delete(sales).where(eq(sales.id, saleId)).run();
    // Revert item status to available if currently sold or returned.
    if (existing.itemId) {
      const item = db.query.items.findFirst({ where: eq(items.id, existing.itemId) }).sync();
      if (item && (item.status === 'sold' || item.status === 'returned')) {
        db.update(items).set({ status: 'available', removalDate: null, updatedAt: ts })
          .where(eq(items.id, item.id)).run();
      }
    }
  });
  tx();

  return NextResponse.json({ success: true });
});