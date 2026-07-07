import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, lte, like, or, asc, desc, sql, inArray } from 'drizzle-orm';
import { db, getSqlite } from '@/lib/db';
import { items, sales, users } from '@/lib/schema';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, escapeLike, paginationEnvelope } from '@/lib/api-utils';
import { canViewAllData, canAccessResource, sessionUserId } from '@/lib/auth-utils';
import { createSaleSchema, refundSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';

const SORT_FIELDS = ['soldDate', 'soldPrice', 'platform', 'createdAt'];

export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const sp = req.nextUrl.searchParams;
    const { page, pageSize, offset } = parsePagination(sp);
    const { sortBy, sortOrder } = parseSortParams(sp, SORT_FIELDS, 'soldDate');

    const viewAll = canViewAllData(session);
    const uid = sessionUserId(session);

    const conditions = [];
    if (!viewAll) conditions.push(eq(sales.soldBy, uid));
    const search = sp.get('search');
    if (search) {
      const pat = `%${escapeLike(search)}%`;
      conditions.push(or(like(items.name, pat), like(sales.platform, pat))!);
    }
    const platform = sp.get('platform');
    if (platform) conditions.push(eq(sales.platform, platform as typeof sales.platform.enumValues));
    const startDate = sp.get('startDate');
    if (startDate) {
      const ts = Math.floor(new Date(startDate).getTime() / 1000);
      if (!isNaN(ts)) conditions.push(gte(sales.soldDate, ts));
    }
    const endDate = sp.get('endDate');
    if (endDate) {
      const ts = Math.floor(new Date(endDate).getTime() / 1000) + 86400;
      if (!isNaN(ts)) conditions.push(lte(sales.soldDate, ts));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const orderFn = sortOrder === 'asc' ? asc : desc;
    const sortCol =
      sortBy === 'soldPrice' ? sales.soldPrice :
      sortBy === 'platform' ? sales.platform :
      sortBy === 'createdAt' ? sales.createdAt : sales.soldDate;

    const rows = await db.query.sales.findMany({
      where,
      with: { item: true },
      orderBy: [orderFn(sortCol)],
      limit: pageSize,
      offset,
    });

    const countResult = db.select({ c: sql<number>`count(*)` }).from(sales)
      .leftJoin(items, eq(items.id, sales.itemId))
      .where(where ?? sql`1=1`).get();
    const total = countResult?.c ?? 0;

    return NextResponse.json({
      sales: rows,
      pagination: paginationEnvelope(page, pageSize, total),
    });
  })(req, { params: Promise.resolve({}) });
}

export async function POST(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = createSaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const uid = sessionUserId(session);
    const data = parsed.data;
    let linkedItem: typeof items.$inferSelect | null = null;

    if (data.itemId) {
      linkedItem = await db.query.items.findFirst({ where: eq(items.id, data.itemId) });
      if (!linkedItem) throw ApiErrors.NotFound('Item');
      if (!canAccessResource(linkedItem.ownerId, session, 'write')) {
        // canViewAll users can record sales for any item? Per spec: "Record sale for any item" → admin only for others.
        throw ApiErrors.Forbidden('You can only record sales for your own items');
      }
      if (linkedItem.status === 'sold') throw ApiErrors.Conflict('Item is already sold');
    }

    const now = Math.floor(Date.now() / 1000);
    const sqlite = getSqlite();

    const created = sqlite.transaction(() => {
      const sale = db.insert(sales).values({
        itemId: data.itemId ?? null,
        soldDate: data.soldDate,
        soldPrice: data.soldPrice,
        shippingCost: data.shippingCost ?? null,
        shippingCollected: data.shippingCollected ?? 0,
        platform: data.platform,
        salesTax: data.salesTax ?? null,
        platformFees: data.platformFees ?? 0,
        refundAmount: 0,
        refundType: 'none',
        soldBy: uid,
        createdAt: now,
      }).returning();

      if (linkedItem) {
        db.update(items)
          .set({ status: 'sold', removalDate: data.soldDate, updatedAt: now })
          .where(eq(items.id, linkedItem.id))
          .run();
      }

      return sale[0];
    })();

    return NextResponse.json(created, { status: 201 });
  })(req, { params: Promise.resolve({}) });
}

export async function PATCH(req: NextRequest) {
  // Process refund
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const { saleId, refundAmount, refundReason, refundType } = parsed.data;
    const sale = await db.query.sales.findFirst({ where: eq(sales.id, saleId) });
    if (!sale) throw ApiErrors.NotFound('Sale');

    // Only sale creator or admin may process refund.
    if (sale.soldBy !== sessionUserId(session) && session.user.role !== 'admin') {
      throw ApiErrors.Forbidden();
    }

    const now = Math.floor(Date.now() / 1000);
    const sqlite = getSqlite();

    const updated = sqlite.transaction(() => {
      const result = db.update(sales)
        .set({ refundAmount, refundReason: refundReason ?? null, refundType })
        .where(eq(sales.id, saleId))
        .returning();

      if (refundType === 'refund_with_return' && sale.itemId) {
        db.update(items)
          .set({ status: 'returned', removalDate: null, updatedAt: now })
          .where(eq(items.id, sale.itemId))
          .run();
      }
      // refund_no_return: item stays sold.

      return result[0];
    })();

    return NextResponse.json(updated);
  })(req, { params: Promise.resolve({}) });
}
