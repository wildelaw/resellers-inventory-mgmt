import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canAccessResource } from '@/lib/auth-utils';
import { updateSaleSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { nowTimestamp, toTimestamp } from '@/lib/utils';

// GET - Get single sale
export async function GET(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    try {
      const { id } = await ctx.params;
      const saleId = Number(id);

      const sale = await db.query.sales.findFirst({
        where: eq(sales.id, saleId),
        with: { item: true, seller: true },
      });

      if (!sale) throw ApiErrors.NotFound('Sale');

      // RBAC: owner, admin, or canViewAll
      if (sale.soldBy !== Number(session.user.id) && !canAccessResource(sale.soldBy, session, 'read')) {
        throw ApiErrors.Forbidden();
      }

      return NextResponse.json(sale);
    } catch (error) {
      return handleApiError(error);
    }
  })(req, ctx);
}

// PUT - Update sale
export async function PUT(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const { id } = await ctx.params;
      const saleId = Number(id);

      const sale = await db.query.sales.findFirst({
        where: eq(sales.id, saleId),
      });

      if (!sale) throw ApiErrors.NotFound('Sale');

      // RBAC: only sale creator or admin
      if (sale.soldBy !== Number(session.user.id) && session.user.role !== 'admin') {
        throw ApiErrors.Forbidden();
      }

      const body = await req.json();
      const validation = updateSaleSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
          { status: 400 }
        );
      }

      const data = validation.data;
      const updateData: Record<string, any> = {};

      if (data.soldDate !== undefined) updateData.soldDate = toTimestamp(data.soldDate);
      if (data.soldPrice !== undefined) updateData.soldPrice = Number(data.soldPrice);
      if (data.shippingCost !== undefined) updateData.shippingCost = data.shippingCost ? Number(data.shippingCost) : null;
      if (data.shippingCollected !== undefined) updateData.shippingCollected = Number(data.shippingCollected);
      if (data.platform !== undefined) updateData.platform = data.platform;
      if (data.salesTax !== undefined) updateData.salesTax = data.salesTax ? Number(data.salesTax) : null;
      if (data.platformFees !== undefined) updateData.platformFees = Number(data.platformFees);

      const updated = await db.update(sales)
        .set(updateData)
        .where(eq(sales.id, saleId))
        .returning();

      return NextResponse.json(updated[0]);
    } catch (error) {
      return handleApiError(error);
    }
  })(req, ctx);
}

// DELETE - Delete sale
export async function DELETE(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const { id } = await ctx.params;
      const saleId = Number(id);

      const sale = await db.query.sales.findFirst({
        where: eq(sales.id, saleId),
      });

      if (!sale) throw ApiErrors.NotFound('Sale');

      // RBAC: only sale creator or admin
      if (sale.soldBy !== Number(session.user.id) && session.user.role !== 'admin') {
        throw ApiErrors.Forbidden();
      }

      // Revert item status if item is sold or returned
      if (sale.itemId) {
        const item = await db.query.items.findFirst({
          where: eq(items.id, sale.itemId),
        });

        if (item && (item.status === 'sold' || item.status === 'returned')) {
          const now = nowTimestamp();
          await db.update(items)
            .set({ status: 'available', removalDate: null, updatedAt: now })
            .where(eq(items.id, sale.itemId));
        }
      }

      await db.delete(sales).where(eq(sales.id, saleId));

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, ctx);
}