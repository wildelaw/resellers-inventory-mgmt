import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, buildPagination } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { createSaleSchema, refundSchema } from '@/lib/validations';
import { canViewAllData } from '@/lib/auth-utils';
import { calculateProfit } from '@/lib/financial';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  return withAuth(req, async (session) => {
    const { page, pageSize, offset } = parsePagination(req.nextUrl.searchParams);
    const conditions = [];
    if (!canViewAllData(session)) conditions.push(eq(sales.soldBy, session.user.id));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(sales).where(where);
    const total = countResult[0].count;
    const saleRows = await db.query.sales.findMany({ where, with: { item: true, seller: true }, orderBy: desc(sales.soldDate), limit: pageSize, offset });
    return NextResponse.json({ sales: saleRows, pagination: buildPagination(page, pageSize, total) });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const body = await req.json();
    const validation = createSaleSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    const { itemId, ...saleData } = validation.data;
    const now = Math.floor(Date.now() / 1000);
    if (itemId) {
      const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      if (item.status === 'sold') return NextResponse.json({ error: 'Item is already sold' }, { status: 409 });
      const sale = await db.transaction(async (tx) => {
        const newSale = await tx.insert(sales).values({ ...saleData, itemId, soldBy: session.user.id, createdAt: now }).returning() as any[];
        await tx.update(items).set({ status: 'sold', removalDate: saleData.soldDate, updatedAt: now }).where(eq(items.id, itemId));
        return newSale[0];
      });
      return NextResponse.json({ sale }, { status: 201 });
    }
    const sale = await db.insert(sales).values({ ...saleData, soldBy: session.user.id, createdAt: now }).returning() as any[];
    return NextResponse.json({ sale: sale[0] }, { status: 201 });
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const body = await req.json();
    const validation = refundSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    const { saleId, refundAmount, refundReason, refundType } = validation.data;
    const sale = await db.query.sales.findFirst({ where: eq(sales.id, saleId) });
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    if (session.user.role !== 'admin' && sale.soldBy !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const now = Math.floor(Date.now() / 1000);
    if (refundType === 'refund_with_return' && sale.itemId) {
      await db.transaction(async (tx) => {
        await tx.update(sales).set({ refundAmount, refundReason, refundType }).where(eq(sales.id, saleId));
        await tx.update(items).set({ status: 'returned', removalDate: null, updatedAt: now }).where(eq(items.id, sale.itemId!));
      });
    } else {
      await db.update(sales).set({ refundAmount, refundReason, refundType }).where(eq(sales.id, saleId));
    }
    const updatedSale = await db.query.sales.findFirst({ where: eq(sales.id, saleId), with: { item: true } });
    return NextResponse.json({ sale: updatedSale });
  });
}
