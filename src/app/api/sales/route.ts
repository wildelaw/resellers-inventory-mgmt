import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sales, items } from '@/lib/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, paginationResponse } from '@/lib/api-utils';
import { createSaleSchema, refundSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { canAccessResource } from '@/lib/auth-utils';
import { toTimestamp } from '@/lib/utils';
import { listSales, parseSaleFilters } from '@/lib/sales-queries';

export const dynamic = 'force-dynamic';

// GET /api/sales — list sales
export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const sp = req.nextUrl.searchParams;
    const pagination = parsePagination(sp);
    const sort = parseSortParams(sp, ['soldDate', 'soldPrice', 'platform', 'createdAt'], 'soldDate');
    const filter = parseSaleFilters(sp);
    const { rows, total } = await listSales(session, pagination, sort, filter);
    return NextResponse.json({
      items: rows,
      pagination: paginationResponse(pagination.page, pagination.pageSize, total),
    });
  })(req, { params: Promise.resolve({}) });
}

// POST /api/sales — create sale (transactional with item status update)
export async function POST(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = createSaleSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }
    const data = parsed.data;
    const soldTs = toTimestamp(data.soldDate);
    if (soldTs === null) return ApiErrors.BadRequest('Invalid soldDate').toResponse();

    // If itemId provided, verify item exists and user may sell it
    let linkedItem: typeof items.$inferSelect | null = null;
    if (data.itemId !== null && data.itemId !== undefined) {
      linkedItem = (await db.query.items.findFirst({ where: eq(items.id, data.itemId) })) ?? null;
      if (!linkedItem) return ApiErrors.NotFound('Item').toResponse();
      // canViewAll cannot sell others' items (write requires owner/admin)
      if (!canAccessResource(linkedItem.ownerId, session.user.id, session, 'write')) {
        return ApiErrors.Forbidden('You can only sell your own items').toResponse();
      }
      if (linkedItem.status === 'sold') {
        return ApiErrors.BadRequest('Item is already sold').toResponse();
      }
    }

    const now = Date.now();
    const created = db.transaction((tx) => {
      const sale = tx
        .insert(sales)
        .values({
          itemId: data.itemId ?? null,
          soldDate: soldTs,
          soldPrice: data.soldPrice,
          shippingCost: data.shippingCost ?? null,
          shippingCollected: data.shippingCollected ?? 0,
          platform: data.platform,
          salesTax: data.salesTax ?? null,
          platformFees: data.platformFees ?? 0,
          refundAmount: data.refundAmount ?? 0,
          refundReason: data.refundReason ?? null,
          refundType: data.refundType ?? 'none',
          soldBy: Number(session.user.id),
          createdAt: now,
        })
        .returning()
        .get();

      if (linkedItem) {
        tx.update(items)
          .set({ status: 'sold', removalDate: soldTs, updatedAt: now })
          .where(eq(items.id, linkedItem.id))
          .run();
      }
      return sale;
    });

    return NextResponse.json(created, { status: 201 });
  })(req, { params: Promise.resolve({}) });
}

// PATCH /api/sales — process refund
export async function PATCH(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }
    const { saleId, refundAmount, refundReason, refundType } = parsed.data;

    const sale = await db.query.sales.findFirst({ where: eq(sales.id, saleId) });
    if (!sale) return ApiErrors.NotFound('Sale').toResponse();
    // Only the sale's creator or admin may refund
    const isAdmin = session.user.role === 'admin';
    if (!isAdmin && String(sale.soldBy) !== String(session.user.id)) {
      return ApiErrors.Forbidden().toResponse();
    }

    const now = Date.now();
    const updated = db.transaction((tx) => {
      const u = tx
        .update(sales)
        .set({
          refundAmount,
          refundReason: refundReason ?? null,
          refundType,
        })
        .where(eq(sales.id, saleId))
        .returning()
        .get();

      if (refundType === 'refund_with_return' && sale.itemId) {
        const item = tx.select().from(items).where(eq(items.id, sale.itemId)).get();
        if (item) {
          tx.update(items)
            .set({ status: 'returned', removalDate: null, updatedAt: now })
            .where(eq(items.id, item.id))
            .run();
        }
      }
      return u;
    });

    return NextResponse.json(updated);
  })(req, { params: Promise.resolve({}) });
}