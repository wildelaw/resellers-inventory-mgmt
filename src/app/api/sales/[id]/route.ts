import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, readJsonBody } from '@/lib/api-utils';
import { canViewAllData, canEditOthersData, sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { updateSaleSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';

type Ctx = { params: Promise<{ id: string }> };

async function getSaleOr404(id: number) {
  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, id),
    with: { item: true, seller: true },
  });
  if (!sale) throw ApiErrors.NotFound('Sale');
  return sale;
}

// GET /api/sales/:id — creator, admin, or canViewAll
export const GET = withAuth(async (req, ctx, session) => {
  const { id } = await ctx!.params;
  const sale = await getSaleOr404(Number(id));

  if (sale.soldBy !== sessionUserId(session) && !canViewAllData(session)) {
    throw ApiErrors.Forbidden();
  }

  return NextResponse.json(sale);
});

// PUT /api/sales/:id — creator or admin
export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx!.params;
  const saleId = Number(id);
  const sale = await getSaleOr404(saleId);

  if (sale.soldBy !== sessionUserId(session) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const body = await readJsonBody(req);
  const validation = updateSaleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 }
    );
  }

  const updated = await db.update(sales).set(validation.data).where(eq(sales.id, saleId)).returning();
  return NextResponse.json(updated[0]);
});

// DELETE /api/sales/:id — creator or admin; reverts item status to available
export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx!.params;
  const saleId = Number(id);
  const sale = await getSaleOr404(saleId);

  if (sale.soldBy !== sessionUserId(session) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const now = new Date();
  db.transaction((tx) => {
    tx.delete(sales).where(eq(sales.id, saleId)).run();
    if (sale.itemId != null) {
      const item = tx.select().from(items).where(eq(items.id, sale.itemId)).get();
      // Revert the item to available if it is currently sold or returned
      if (item && (item.status === 'sold' || item.status === 'returned')) {
        tx.update(items).set({
          status: 'available',
          removalDate: null,
          updatedAt: now,
        }).where(eq(items.id, item.id)).run();
      }
    }
    return null;
  });

  return NextResponse.json({ success: true });
});