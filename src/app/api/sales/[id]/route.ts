import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sales, items } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { updateSaleSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { canAccessResource } from '@/lib/auth-utils';
import { toTimestamp } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function getSale(id: number) {
  return db.query.sales.findFirst({
    where: eq(sales.id, id),
    with: { item: true, seller: true },
  });
}

// GET /api/sales/[id]
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();
    const sale = await getSale(id);
    if (!sale) return ApiErrors.NotFound('Sale').toResponse();
    // owner = sale.soldBy; canViewAll users and admins can read
    if (!canAccessResource(sale.soldBy, session.user.id, session, 'read')) {
      return ApiErrors.Forbidden().toResponse();
    }
    return NextResponse.json(sale);
  })(req, ctx);
}

// PUT /api/sales/[id]
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();

    const existing = await getSale(id);
    if (!existing) return ApiErrors.NotFound('Sale').toResponse();
    if (!canAccessResource(existing.soldBy, session.user.id, session, 'write')) {
      return ApiErrors.Forbidden().toResponse();
    }

    const body = await req.json();
    const parsed = updateSaleSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }
    const data = parsed.data;

    const update: Record<string, unknown> = {};
    if (data.itemId !== undefined) update.itemId = data.itemId;
    if (data.soldDate !== undefined) {
      const ts = toTimestamp(data.soldDate);
      if (ts !== null) update.soldDate = ts;
    }
    if (data.soldPrice !== undefined) update.soldPrice = data.soldPrice;
    if (data.shippingCost !== undefined) update.shippingCost = data.shippingCost;
    if (data.shippingCollected !== undefined) update.shippingCollected = data.shippingCollected;
    if (data.platform !== undefined) update.platform = data.platform;
    if (data.salesTax !== undefined) update.salesTax = data.salesTax;
    if (data.platformFees !== undefined) update.platformFees = data.platformFees;
    if (data.refundAmount !== undefined) update.refundAmount = data.refundAmount;
    if (data.refundReason !== undefined) update.refundReason = data.refundReason;
    if (data.refundType !== undefined) update.refundType = data.refundType;

    const updated = db.update(sales).set(update).where(eq(sales.id, id)).returning().get();
    return NextResponse.json(updated);
  })(req, ctx);
}

// DELETE /api/sales/[id] — revert item status if sold/returned
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();

    const existing = await getSale(id);
    if (!existing) return ApiErrors.NotFound('Sale').toResponse();
    if (!canAccessResource(existing.soldBy, session.user.id, session, 'write')) {
      return ApiErrors.Forbidden().toResponse();
    }

    const now = Date.now();
    db.transaction((tx) => {
      tx.delete(sales).where(eq(sales.id, id)).run();
      if (existing.itemId) {
        const item = tx.select().from(items).where(eq(items.id, existing.itemId)).get();
        if (item && (item.status === 'sold' || item.status === 'returned')) {
          tx.update(items)
            .set({ status: 'available', removalDate: null, updatedAt: now })
            .where(eq(items.id, item.id))
            .run();
        }
      }
    });

    return NextResponse.json({ success: true });
  })(req, ctx);
}