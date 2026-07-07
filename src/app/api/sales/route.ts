import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, sales, users } from '@/lib/schema';
import { eq, and, gte, lte, like, or, sql, desc, asc } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, parseDateFilters, escapeLike, paginatedResponse } from '@/lib/api-utils';
import { canViewAllData, canAccessResource } from '@/lib/auth-utils';
import { createSaleSchema, refundSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { nowTimestamp, toTimestamp } from '@/lib/utils';

// GET - List sales
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    try {
      const { searchParams } = new URL(req.url);
      const { page, pageSize, offset, limit } = parsePagination(searchParams);
      const { sortBy, sortOrder } = parseSortParams(searchParams, ['soldDate', 'soldPrice', 'createdAt', 'platform'], 'soldDate');
      const { startDate, endDate } = parseDateFilters(searchParams);

      const platform = searchParams.get('platform') || undefined;
      const search = searchParams.get('search') || undefined;

      const conditions = [];

      // RBAC
      if (!canViewAllData(session)) {
        conditions.push(eq(sales.soldBy, Number(session.user.id)));
      }

      if (platform) {
        conditions.push(eq(sales.platform, platform as any));
      }
      if (search) {
        const escaped = escapeLike(search);
        conditions.push(
          or(
            like(sales.refundReason, `%${escaped}%`),
            sql`EXISTS (SELECT 1 FROM items WHERE items.id = ${sales.itemId} AND items.name LIKE ${'%' + escaped + '%'})`
          )!
        );
      }
      if (startDate) {
        conditions.push(gte(sales.soldDate, startDate));
      }
      if (endDate) {
        conditions.push(lte(sales.soldDate, endDate));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      // Count
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(sales)
        .where(where);
      const total = countResult[0]?.count ?? 0;

      // Get sales
      const sortColumn = sortBy === 'soldDate' ? sales.soldDate
        : sortBy === 'soldPrice' ? sales.soldPrice
        : sortBy === 'platform' ? sales.platform
        : sales.createdAt;

      const result = await db.query.sales.findMany({
        where,
        with: {
          item: true,
          seller: true,
        },
        orderBy: sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn),
        limit,
        offset,
      });

      return NextResponse.json(paginatedResponse(result, total, page, pageSize));
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}

// POST - Create sale
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const body = await req.json();
      const validation = createSaleSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
          { status: 400 }
        );
      }

      const data = validation.data;
      const now = nowTimestamp();
      const userId = Number(session.user.id);

      // If itemId provided, verify item exists and user has access
      let linkedItem = null;
      if (data.itemId) {
        linkedItem = await db.query.items.findFirst({
          where: eq(items.id, data.itemId),
        });

        if (!linkedItem) throw ApiErrors.NotFound('Item');

        // Check user can record sale for this item
        if (!canAccessResource(linkedItem.ownerId, session, 'write')) {
          throw ApiErrors.Forbidden('You can only record sales for your own items');
        }

        // Check item is not already sold
        if (linkedItem.status === 'sold') {
          throw ApiErrors.BadRequest('Item is already sold');
        }
      }

      const newSale = await db.insert(sales).values({
        itemId: data.itemId || null,
        soldDate: toTimestamp(data.soldDate),
        soldPrice: Number(data.soldPrice),
        shippingCost: data.shippingCost ? Number(data.shippingCost) : null,
        shippingCollected: Number(data.shippingCollected) || 0,
        platform: data.platform,
        salesTax: data.salesTax ? Number(data.salesTax) : null,
        platformFees: Number(data.platformFees) || 0,
        refundAmount: 0,
        refundType: 'none',
        soldBy: userId,
        createdAt: now,
      }).returning();

      // Transactionally update item status to sold
      if (linkedItem) {
        await db.update(items)
          .set({ status: 'sold', removalDate: toTimestamp(data.soldDate), updatedAt: now })
          .where(eq(items.id, linkedItem.id));
      }

      return NextResponse.json(newSale[0], { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}

// PATCH - Process refund
export async function PATCH(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const body = await req.json();
      const validation = refundSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
          { status: 400 }
        );
      }

      const { saleId, refundAmount, refundReason, refundType } = validation.data;

      const sale = await db.query.sales.findFirst({
        where: eq(sales.id, saleId),
        with: { item: true },
      });

      if (!sale) throw ApiErrors.NotFound('Sale');

      // RBAC: only sale creator or admin
      if (sale.soldBy !== Number(session.user.id) && session.user.role !== 'admin') {
        throw ApiErrors.Forbidden();
      }

      const now = nowTimestamp();

      // Update sale
      await db.update(sales)
        .set({
          refundAmount: Number(refundAmount),
          refundReason: refundReason || null,
          refundType,
        })
        .where(eq(sales.id, saleId));

      // If refund with return, update item status
      if (refundType === 'refund_with_return' && sale.itemId) {
        await db.update(items)
          .set({
            status: 'returned',
            removalDate: null,
            updatedAt: now,
          })
          .where(eq(items.id, sale.itemId));
      }

      // Return updated sale
      const updatedSale = await db.query.sales.findFirst({
        where: eq(sales.id, saleId),
        with: { item: true },
      });

      return NextResponse.json(updatedSale);
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}