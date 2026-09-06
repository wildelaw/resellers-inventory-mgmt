import { NextResponse, type NextRequest } from 'next/server';
import { and, asc, desc, eq, gte, lte, or, sql } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, readJsonBody, parsePagination, parseSortParams, parseDateRange, escapeLike } from '@/lib/api-utils';
import { canViewAllData, canEditOthersData, sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { createSaleSchema, processRefundSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';

const SORT_FIELDS = ['soldDate', 'createdAt', 'soldPrice', 'platform'];

// GET /api/sales — paginated, filterable, sortable list
export const GET = withAuth(async (req, ctx, session) => {
  const searchParams = req.nextUrl.searchParams;
  const { page, pageSize, offset } = parsePagination(searchParams);
  const sort = parseSortParams(searchParams, SORT_FIELDS, 'soldDate');
  const { startDate, endDate } = parseDateRange(searchParams);

  const conditions = [];
  // RBAC: standard users see only their own sales
  if (!canViewAllData(session)) {
    conditions.push(eq(sales.soldBy, sessionUserId(session)));
  }

  const platform = searchParams.get('platform');
  if (platform) conditions.push(eq(sales.platform, platform as typeof sales.$inferSelect.platform));

  const search = searchParams.get('search');
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    conditions.push(or(
      sql`EXISTS (SELECT 1 FROM items i WHERE i.id = ${sales.itemId} AND i.name LIKE ${pattern} ESCAPE '\\')`,
      sql`${sales.refundReason} LIKE ${pattern} ESCAPE '\\'`
    ));
  }

  if (startDate) conditions.push(gte(sales.soldDate, startDate));
  if (endDate) conditions.push(lte(sales.soldDate, endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn = {
    soldDate: sales.soldDate,
    createdAt: sales.createdAt,
    soldPrice: sales.soldPrice,
    platform: sales.platform,
  }[sort.field] ?? sales.soldDate;

  const [rows, [{ count }]] = await Promise.all([
    db.query.sales.findMany({
      where,
      with: { item: true, seller: true },
      orderBy: [sort.order === 'asc' ? asc(sortColumn) : desc(sortColumn)],
      limit: pageSize,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(sales).where(where),
  ]);

  const total = Number(count);
  return NextResponse.json({
    items: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
});

// POST /api/sales — create sale; transactionally marks the item sold
export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await readJsonBody(req);
  const validation = createSaleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 }
    );
  }

  const data = validation.data;
  const userId = sessionUserId(session);

  if (data.itemId != null) {
    const item = await db.query.items.findFirst({ where: eq(items.id, data.itemId) });
    if (!item) throw ApiErrors.NotFound('Item');
    if (item.status === 'sold') throw ApiErrors.Conflict('Item has already been sold');
    // Recording a sale for any item requires ownership, admin, or canViewAll
    if (item.ownerId !== userId && !canViewAllData(session)) throw ApiErrors.Forbidden();
  }

  const now = new Date();
  // better-sqlite3 transactions are synchronous — the callback must not be async
  const sale = db.transaction((tx) => {
    const inserted = tx.insert(sales).values({
      ...data,
      soldBy: userId,
      createdAt: now,
    }).returning().all();

    if (data.itemId != null) {
      tx.update(items).set({
        status: 'sold',
        removalDate: data.soldDate,
        updatedAt: now,
      }).where(eq(items.id, data.itemId)).run();
    }

    return inserted[0];
  });

  return NextResponse.json(sale, { status: 201 });
});

// PATCH /api/sales — process a refund (sale creator or admin)
export const PATCH = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await readJsonBody(req);
  const validation = processRefundSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 }
    );
  }

  const { saleId, refundAmount, refundReason, refundType } = validation.data;

  const sale = await db.query.sales.findFirst({ where: eq(sales.id, saleId) });
  if (!sale) throw ApiErrors.NotFound('Sale');
  if (sale.soldBy !== sessionUserId(session) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const now = new Date();
  const updated = db.transaction((tx) => {
    const result = tx.update(sales).set({
      refundAmount,
      refundReason: refundReason ?? null,
      refundType,
    }).where(eq(sales.id, saleId)).returning().all();

    if (refundType === 'refund_with_return' && sale.itemId != null) {
      tx.update(items).set({
        status: 'returned',
        removalDate: null,
        updatedAt: now,
      }).where(eq(items.id, sale.itemId)).run();
    }

    return result[0];
  });

  return NextResponse.json(updated);
});