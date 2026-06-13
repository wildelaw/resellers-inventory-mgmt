import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canViewAllData, canEditOthersData } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { sales, items } from '@/lib/schema';
import { updateSaleSchema } from '@/lib/validations';
import { eq } from 'drizzle-orm';

export const GET = withAuth(async (req, ctx, session) => {
  const { id } = await ctx.params;
  const saleId = parseInt(id);

  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
    with: { item: true, seller: true },
  });

  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
  if (sale.soldBy !== parseInt(session.user.id) && !canViewAllData(session)) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  return NextResponse.json(sale);
});

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const saleId = parseInt(id);

  const sale = await db.query.sales.findFirst({ where: eq(sales.id, saleId) });
  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
  if (sale.soldBy !== parseInt(session.user.id) && !canEditOthersData(session)) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const body = await req.json();
  const validation = updateSaleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
      { status: 400 }
    );
  }

  const updateData: any = { ...validation.data, updatedAt: new Date() };
  if (validation.data.soldDate) updateData.soldDate = new Date(validation.data.soldDate);

  const updated = await db.update(sales).set(updateData).where(eq(sales.id, saleId)).returning() as any[];
  return NextResponse.json(updated[0]);
});

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const saleId = parseInt(id);

  const sale = await db.query.sales.findFirst({ where: eq(sales.id, saleId) });
  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
  if (sale.soldBy !== parseInt(session.user.id) && !canEditOthersData(session)) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  await db.transaction(async (tx) => {
    await tx.delete(sales).where(eq(sales.id, saleId));

    if (sale.itemId && (sale.refundType === 'none' || sale.refundType === 'refund_no_return')) {
      const item = await tx.query.items.findFirst({ where: eq(items.id, sale.itemId) });
      if (item && (item.status === 'sold' || item.status === 'returned')) {
        await tx.update(items).set({
          status: 'available',
          removalDate: null,
          updatedAt: new Date(),
        }).where(eq(items.id, sale.itemId));
      }
    }
  });

  return NextResponse.json({ success: true });
});