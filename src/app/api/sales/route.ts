import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, escapeLike, paginateResults } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { sales, items } from '@/lib/schema';
import { createSaleSchema, refundSaleSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { canViewAllData, canAccessResource } from '@/lib/auth-utils';
import { eq, and, like, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { parseDateParam } from '@/lib/utils';
import type { Platform } from '@/lib/constants';

export const GET = withAuth(async (req, _ctx, session) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize, offset } = parsePagination(searchParams);
  const { field: sortField, direction: sortDirection } = parseSortParams(
    searchParams,
    ['soldDate', 'soldPrice', 'platform', 'createdAt'],
    'soldDate'
  );

  const viewAll = canViewAllData(session);
  const conditions = [];

  if (!viewAll) {
    conditions.push(eq(sales.soldBy, Number(session.user.id)));
  }

  const platform = searchParams.get('platform') as Platform | null;
  const dateFrom = parseDateParam(searchParams.get('dateFrom'));
  const dateTo = parseDateParam(searchParams.get('dateTo'));
  const search = searchParams.get('search');

  if (platform) {
    conditions.push(eq(sales.platform, platform));
  }
  if (dateFrom !== null) {
    conditions.push(gte(sales.soldDate, dateFrom));
  }
  if (dateTo !== null) {
    conditions.push(lte(sales.soldDate, dateTo));
  }
  if (search) {
    conditions.push(like(sales.platform, `%${escapeLike(search)}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn = sortField === 'soldDate' ? sales.soldDate
    : sortField === 'soldPrice' ? sales.soldPrice
    : sortField === 'platform' ? sales.platform
    : sales.createdAt;
  const orderByClause = sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [result, countResult] = await Promise.all([
    db.select().from(sales).where(whereClause).orderBy(orderByClause).limit(pageSize).offset(offset).all(),
    db.select({ count: sql<number>`count(*)` }).from(sales).where(whereClause).get(),
  ]);

  const total = countResult?.count ?? 0;

  return NextResponse.json(paginateResults(result, total, page, pageSize));
});

export const POST = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = createSaleSchema.parse(body);

  // If itemId is provided, verify item exists and ownership
  if (parsed.itemId) {
    const item = await db.select().from(items).where(eq(items.id, parsed.itemId)).get();
    if (!item) {
      throw ApiErrors.NotFound('Item');
    }
    if (!canAccessResource(item.ownerId, Number(session.user.id), session, 'write')) {
      throw ApiErrors.Forbidden();
    }

    // Transactionally update item status to 'sold'
    const now = Math.floor(Date.now() / 1000);
    await db.update(items)
      .set({ status: 'sold', removalDate: now, updatedAt: now })
      .where(eq(items.id, parsed.itemId))
      .run();
  }

  const result = await db.insert(sales).values({
    ...parsed,
    soldBy: Number(session.user.id),
  }).returning().get();

  return NextResponse.json(result, { status: 201 });
});

export const PATCH = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = refundSaleSchema.parse(body);

  const sale = await db.select().from(sales).where(eq(sales.id, parsed.saleId)).get();
  if (!sale) {
    throw ApiErrors.NotFound('Sale');
  }

  if (!canAccessResource(sale.soldBy, Number(session.user.id), session, 'write')) {
    throw ApiErrors.Forbidden();
  }

  const now = Math.floor(Date.now() / 1000);

  await db.update(sales)
    .set({
      refundAmount: parsed.refundAmount,
      refundReason: parsed.refundReason || null,
      refundType: parsed.refundType,
    })
    .where(eq(sales.id, parsed.saleId))
    .run();

  // If refund_with_return, set item status to 'returned' and clear removalDate
  if (parsed.refundType === 'refund_with_return' && sale.itemId) {
    await db.update(items)
      .set({ status: 'returned', removalDate: null, updatedAt: now })
      .where(eq(items.id, sale.itemId))
      .run();
  }

  const updated = await db.select().from(sales).where(eq(sales.id, parsed.saleId)).get();

  return NextResponse.json(updated);
});