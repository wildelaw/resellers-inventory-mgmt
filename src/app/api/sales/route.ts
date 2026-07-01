import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, escapeLike } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { createSaleSchema, refundSchema } from '@/lib/validations';
import { canViewAllData, canEditOthersData } from '@/lib/auth-utils';
import { ApiErrors } from '@/lib/api-errors';
import { eq, and, gte, lte, like, desc, asc, count, sql, inArray } from 'drizzle-orm';
import { nowTimestamp, toTimestamp } from '@/lib/utils';
import { getRawDb } from '@/lib/db';
import type { Session } from 'next-auth';

export const GET = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize, offset, limit } = parsePagination(searchParams);
  const { field, order } = parseSortParams(searchParams, ['soldDate', 'soldPrice', 'createdAt', 'platform'], 'soldDate');

  const search = searchParams.get('search') || undefined;
  const platform = searchParams.get('platform') || undefined;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const conditions = [];
  if (!canViewAllData(session)) {
    conditions.push(eq(sales.soldBy, parseInt(session.user.id, 10)));
  }
  if (platform) conditions.push(eq(sales.platform, platform));
  if (search) {
    const escaped = escapeLike(search);
    conditions.push(like(sales.platform, `%${escaped}%`));
  }
  if (startDate) conditions.push(gte(sales.soldDate, toTimestamp(startDate)));
  if (endDate) conditions.push(lte(sales.soldDate, toTimestamp(endDate)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const sortCol = field === 'soldPrice' ? sales.soldPrice
    : field === 'platform' ? sales.platform
    : field === 'createdAt' ? sales.createdAt
    : sales.soldDate;
  const orderBy = order === 'asc' ? asc(sortCol) : desc(sortCol);

  const [data, [{ total }]] = await Promise.all([
    db.query.sales.findMany({
      where,
      with: { item: true, seller: true },
      orderBy,
      limit,
      offset,
    }),
    db.select({ total: count() }).from(sales).where(where ?? sql`1=1`),
  ]);

  return NextResponse.json({
    sales: data,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

export const POST = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = createSaleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 },
    );
  }

  const data = validation.data;
  const now = nowTimestamp();
  const soldDate = toTimestamp(data.soldDate);
  const userId = parseInt(session.user.id, 10);

  // If itemId provided, verify item exists, not sold, and user owns it (or admin/canViewAll)
  let item: typeof items.$inferSelect | undefined;
  if (data.itemId) {
    item = await db.query.items.findFirst({ where: eq(items.id, data.itemId) });
    if (!item) throw ApiErrors.NotFound('Item');
    if (item.status === 'sold') throw ApiErrors.BadRequest('Item is already sold');
    if (item.ownerId !== userId && !canEditOthersData(session)) {
      throw ApiErrors.Forbidden();
    }
  }

  const sqlite = getRawDb();
  const sale = sqlite.transaction(() => {
    const result = sqlite.prepare(
      'INSERT INTO sales (item_id, sold_date, sold_price, shipping_cost, shipping_collected, platform, sales_tax, platform_fees, refund_amount, refund_reason, refund_type, sold_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      data.itemId ?? null,
      soldDate,
      data.soldPrice,
      data.shippingCost ?? null,
      data.shippingCollected ?? 0,
      data.platform,
      data.salesTax ?? null,
      data.platformFees ?? 0,
      data.refundAmount ?? 0,
      data.refundReason ?? null,
      data.refundType ?? 'none',
      userId,
      now,
    );

    if (item) {
      sqlite.prepare(
        'UPDATE items SET status = ?, removal_date = ?, updated_at = ? WHERE id = ?',
      ).run('sold', soldDate, now, item.id);
    }

    return result.lastInsertRowid;
  })();

  const created = await db.query.sales.findFirst({
    where: eq(sales.id, Number(sale)),
    with: { item: true, seller: true },
  });

  return NextResponse.json(created, { status: 201 });
});

export const PATCH = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = refundSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 },
    );
  }

  const { saleId, refundAmount, refundReason, refundType } = validation.data;

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

  const updated = sqlite.transaction(() => {
    sqlite.prepare(
      'UPDATE sales SET refund_amount = ?, refund_reason = ?, refund_type = ? WHERE id = ?',
    ).run(refundAmount, refundReason ?? null, refundType, saleId);

    if (refundType === 'refund_with_return' && sale.itemId) {
      sqlite.prepare(
        'UPDATE items SET status = ?, removal_date = NULL, updated_at = ? WHERE id = ?',
      ).run('returned', now, sale.itemId);
    }
    // refund_no_return: item stays sold

    return saleId;
  })();

  const result = await db.query.sales.findFirst({
    where: eq(sales.id, updated),
    with: { item: true, seller: true },
  });

  return NextResponse.json(result);
});