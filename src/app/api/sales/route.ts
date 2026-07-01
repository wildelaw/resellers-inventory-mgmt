import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, parseDateRange, buildPaginationResponse, escapeLike } from '@/lib/api-utils';
import { canViewAllData } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { sales, items } from '@/lib/schema';
import { createSaleSchema, updateRefundSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { eq, and, gte, lte, like, or, desc, asc, sql } from 'drizzle-orm';

/**
 * GET /api/sales
 * List sales with filtering, sorting, and pagination
 */
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const { searchParams } = new URL(req.url);
    const { page, pageSize, offset } = parsePagination(searchParams);
    const { sortBy, sortOrder } = parseSortParams(
      searchParams,
      ['soldDate', 'soldPrice', 'platform', 'createdAt'],
      'soldDate'
    );
    const { startDate, endDate } = parseDateRange(searchParams);

    // Build where conditions
    const conditions = [];

    // RBAC: Standard users see only their own sales
    if (!canViewAllData(session)) {
      conditions.push(eq(sales.soldBy, parseInt(session.user.id)));
    }

    // Platform filter
    const platform = searchParams.get('platform');
    if (platform) {
      conditions.push(eq(sales.platform, platform as any));
    }

    // Search filter (item name via join)
    const search = searchParams.get('search');
    
    // Date range filter
    if (startDate) {
      conditions.push(gte(sales.soldDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(sales.soldDate, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sales)
      .where(whereClause);

    // Get sales with item and seller info
    const orderColumn = sales[sortBy as keyof typeof sales] || sales.soldDate;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const salesList = await db.query.sales.findMany({
      where: whereClause,
      with: {
        item: {
          columns: {
            id: true,
            name: true,
            purchasePrice: true,
          },
        },
        seller: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: orderFn(orderColumn),
      limit: pageSize,
      offset,
    });

    // Filter by search if provided (post-query since it's on item name)
    let filteredSales = salesList;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSales = salesList.filter(sale => 
        sale.item?.name.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      sales: filteredSales,
      pagination: buildPaginationResponse(page, pageSize, count),
    });
  })(req);
}

/**
 * POST /api/sales
 * Create a new sale
 */
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const validation = createSaleSchema.safeParse(body);

    if (!validation.success) {
      throw ApiErrors.ValidationError(
        'Validation failed',
        validation.error.issues.map(i => i.message)
      );
    }

    const saleData = validation.data;

    // If itemId is provided, verify item exists and update status
    if (saleData.itemId) {
      const item = await db.query.items.findFirst({
        where: eq(items.id, saleData.itemId),
      });

      if (!item) {
        throw ApiErrors.NotFound('Item');
      }

      // Check if item is already sold
      if (item.status === 'sold') {
        throw ApiErrors.BadRequest('Item is already sold');
      }

      // Check ownership (user must own the item or be admin/canViewAll)
      if (session.user.role !== 'admin' && !session.user.canViewAll) {
        if (item.ownerId !== parseInt(session.user.id)) {
          throw ApiErrors.Forbidden('You do not own this item');
        }
      }

      // Create sale and update item status in transaction
      const [sale] = await db.transaction(async (tx) => {
        const [newSale] = await tx.insert(sales).values({
          ...saleData,
          soldBy: parseInt(session.user.id),
          createdAt: new Date(),
        }).returning();

        await tx
          .update(items)
          .set({
            status: 'sold',
            removalDate: saleData.soldDate,
            updatedAt: new Date(),
          })
          .where(eq(items.id, saleData.itemId!));

        return [newSale];
      });

      return NextResponse.json(sale, { status: 201 });
    } else {
      // Create sale without item
      const [sale] = await db.insert(sales).values({
        ...saleData,
        soldBy: parseInt(session.user.id),
        createdAt: new Date(),
      }).returning();

      return NextResponse.json(sale, { status: 201 });
    }
  })(req);
}

/**
 * PATCH /api/sales
 * Process a refund
 */
export async function PATCH(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const validation = updateRefundSchema.safeParse(body);

    if (!validation.success) {
      throw ApiErrors.ValidationError(
        'Validation failed',
        validation.error.issues.map(i => i.message)
      );
    }

    const { saleId, refundAmount, refundReason, refundType } = validation.data;

    // Get existing sale
    const existingSale = await db.query.sales.findFirst({
      where: eq(sales.id, saleId),
      with: {
        item: true,
      },
    });

    if (!existingSale) {
      throw ApiErrors.NotFound('Sale');
    }

    // Check ownership
    if (session.user.role !== 'admin' && existingSale.soldBy !== parseInt(session.user.id)) {
      throw ApiErrors.Forbidden();
    }

    // Process refund in transaction
    await db.transaction(async (tx) => {
      // Update sale with refund info
      await tx
        .update(sales)
        .set({
          refundAmount,
          refundReason,
          refundType,
        })
        .where(eq(sales.id, saleId));

      // If refund_with_return, update item status
      if (refundType === 'refund_with_return' && existingSale.itemId) {
        await tx
          .update(items)
          .set({
            status: 'returned',
            removalDate: null,
            updatedAt: new Date(),
          })
          .where(eq(items.id, existingSale.itemId));
      }
    });

    return NextResponse.json({
      message: 'Refund processed successfully',
    });
  })(req);
}
