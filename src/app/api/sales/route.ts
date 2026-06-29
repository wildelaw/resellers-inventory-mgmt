import { NextResponse } from 'next/server';
import { and, eq, gte, lte, like, or, desc, asc, sql } from 'drizzle-orm';
import { db, getRawDb } from '@/lib/db';
import { sales, items, nowTs } from '@/lib/schema';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, paginationMeta, likeContains } from '@/lib/api-utils';
import { canViewAllData, canEditOthersData, currentUserId } from '@/lib/auth-utils';
import { createSaleSchema, refundSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { PLATFORMS } from '@/lib/constants';
import type { Platform } from '@/lib/constants';

const SORT_FIELDS = ['soldDate', 'soldPrice', 'createdAt', 'platform'];

export const GET = withAuth(async (req, _ctx, session) => {
  const sp = req.nextUrl.searchParams;
  const { limit, offset, page, pageSize } = parsePagination(sp);
  const { sortBy, sortOrder } = parseSortParams(sp, SORT_FIELDS, 'soldDate');

  const platform = sp.get('platform') ?? undefined;
  const search = sp.get('search') ?? undefined;
  const startTs = sp.get('startDate') ? new Date(sp.get('startDate') as string).getTime() / 1000 : null;
  const endTs = sp.get('endDate') ? new Date(sp.get('endDate') as string).getTime() / 1000 : null;

  const uid = currentUserId(session);
  const viewAll = canViewAllData(session);

  const conditions = [];
  if (!viewAll) conditions.push(eq(sales.soldBy, uid));
  if (platform && PLATFORMS.includes(platform as Platform)) conditions.push(eq(sales.platform, platform as Platform));
  if (startTs) conditions.push(gte(sales.soldDate, Math.floor(startTs)));
  if (endTs) conditions.push(lte(sales.soldDate, Math.floor(endTs)));
  if (search) {
    const term = likeContains(search);
    // search by linked item name via sub-relation: filter in TS for simplicity
    conditions.push(or(like(sales.refundReason, term)) ?? eq(sales.id, 0));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const sortCol =
    sortBy === 'soldPrice' ? sales.soldPrice
    : sortBy === 'createdAt' ? sales.createdAt
    : sortBy === 'platform' ? sales.platform
    : sales.soldDate;
  const orderFn = sortOrder === 'asc' ? asc : desc;

  const total = db.select({ c: sql<number>`count(*)` }).from(sales).where(where).get()?.c ?? 0;
  const rows = db.query.sales.findMany({
    where,
    with: { item: true },
    orderBy: [orderFn(sortCol)],
    limit,
    offset,
  }).sync();

  // Optional name search filter (post-filter in TS since name lives on item relation).
  let filtered = rows;
  if (search) {
    const term = search.toLowerCase();
    filtered = rows.filter((r) => (r.item?.name ?? '').toLowerCase().includes(term));
  }

  return NextResponse.json({
    sales: filtered,
    pagination: paginationMeta(page, pageSize, total),
  });
});

export const POST = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = createSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const uid = currentUserId(session);
  const isAdmin = canEditOthersData(session);

  let linkedItem: typeof items.$inferSelect | null = null;
  if (data.itemId) {
    linkedItem = db.query.items.findFirst({ where: eq(items.id, data.itemId) }).sync() ?? null;
    if (!linkedItem) throw ApiErrors.NotFound('Item');
    if (linkedItem.ownerId !== uid && !isAdmin) throw ApiErrors.Forbidden();
    if (linkedItem.status === 'sold') throw ApiErrors.Conflict('Item already sold');
  }

  const ts = nowTs();
  const sqlite = getRawDb();
  let createdSale: typeof sales.$inferSelect;

  const tx = sqlite.transaction(() => {
    const [s] = db.insert(sales).values({
      itemId: data.itemId ?? null,
      soldDate: data.soldDate as number,
      soldPrice: data.soldPrice,
      shippingCost: data.shippingCost ?? null,
      shippingCollected: data.shippingCollected ?? 0,
      platform: data.platform,
      salesTax: data.salesTax ?? null,
      platformFees: data.platformFees ?? 0,
      refundAmount: data.refundAmount ?? 0,
      refundReason: data.refundReason ?? null,
      refundType: data.refundType ?? 'none',
      soldBy: uid,
      createdAt: ts,
    }).returning().all();
    createdSale = s;

    if (linkedItem) {
      // Any -> sold: set removalDate to soldDate.
      db.update(items).set({
        status: 'sold',
        removalDate: data.soldDate as number,
        updatedAt: ts,
      }).where(eq(items.id, linkedItem.id)).run();
    }
  });
  tx();

  return NextResponse.json(createdSale!, { status: 201 });
});

/** PATCH /api/sales — process a refund. */
export const PATCH = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const { saleId, refundAmount, refundReason, refundType } = parsed.data;
  const uid = currentUserId(session);
  const isAdmin = canEditOthersData(session);

  const sale = db.query.sales.findFirst({ where: eq(sales.id, saleId) }).sync();
  if (!sale) throw ApiErrors.NotFound('Sale');
  if (sale.soldBy !== uid && !isAdmin) throw ApiErrors.Forbidden();

  const ts = nowTs();
  const sqlite = getRawDb();
  let updatedSale: typeof sales.$inferSelect;

  const tx = sqlite.transaction(() => {
    const [s] = db.update(sales).set({
      refundAmount,
      refundReason: refundReason ?? null,
      refundType,
    }).where(eq(sales.id, saleId)).returning().all();
    updatedSale = s;

    if (refundType === 'refund_with_return' && sale.itemId) {
      db.update(items).set({
        status: 'returned',
        removalDate: null,
        updatedAt: ts,
      }).where(eq(items.id, sale.itemId)).run();
    }
    // refund_no_return: item stays sold; refund recorded (no item change).
  });
  tx();

  return NextResponse.json(updatedSale!);
});