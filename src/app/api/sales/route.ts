import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, escapeLike } from '@/lib/api-utils';
import { canViewAllData } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { sales, items } from '@/lib/schema';
import { createSaleSchema, refundSchema } from '@/lib/validations';
import { eq, and, or, like, gte, lte, desc, asc, sql } from 'drizzle-orm';

export const GET = withAuth(async (req, ctx, session) => {
  const url = new URL(req.url);
  const { page, pageSize, offset } = parsePagination(url.searchParams);
  const sortBy = parseSortParams(url.searchParams, ['soldDate', 'soldPrice', 'platform', 'createdAt'], 'soldDate');

  const conditions = [];
  if (!canViewAllData(session)) {
    conditions.push(eq(sales.soldBy, parseInt(session.user.id)));
  }

  const platform = url.searchParams.get('platform');
  if (platform) conditions.push(eq(sales.platform, platform as any));

  const search = url.searchParams.get('search');
  if (search) {
    const term = escapeLike(search);
    conditions.push(or(like(sql`CAST(${sales.soldPrice} AS TEXT)`, `%${term}%`), eq(sales.itemId, parseInt(search) || 0))!);
  }

  const startDate = url.searchParams.get('startDate');
  if (startDate) conditions.push(gte(sales.soldDate, new Date(startDate)));

  const endDate = url.searchParams.get('endDate');
  if (endDate) conditions.push(lte(sales.soldDate, new Date(endDate)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db.query.sales.findMany({
    where,
    with: { item: true, seller: true },
    limit: pageSize,
    offset,
    orderBy: sortBy.direction === 'desc' ? desc(sales.soldDate) : asc(sales.soldDate),
  });

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(sales).where(where);
  const total = Number(countResult[0].count);
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({
    sales: result,
    pagination: { page, pageSize, total, totalPages },
  });
});

export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = createSaleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
      { status: 400 }
    );
  }

  const userId = parseInt(session.user.id);

  if (validation.data.itemId) {
    const item = await db.query.items.findFirst({ where: eq(items.id, validation.data.itemId) });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    if (item.status === 'sold') return NextResponse.json({ error: 'Item is already sold' }, { status: 409 });
    if (item.ownerId !== userId && session.user.role !== 'admin' && !canViewAllData(session)) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
    }
  }

  const sale = await db.transaction(async (tx) => {
    const newSale = await tx.insert(sales).values({
      ...validation.data,
      itemId: validation.data.itemId ?? null,
      soldDate: new Date(validation.data.soldDate),
      soldBy: userId,
      createdAt: new Date(),
    }).returning() as any[];

    if (validation.data.itemId) {
      await tx.update(items).set({
        status: 'sold',
        removalDate: new Date(validation.data.soldDate),
        updatedAt: new Date(),
      }).where(eq(items.id, validation.data.itemId));
    }

    return newSale[0];
  });

  return NextResponse.json(sale, { status: 201 });
});

export const PATCH = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = refundSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
      { status: 400 }
    );
  }

  const { saleId, refundAmount, refundReason, refundType } = validation.data;
  const userId = parseInt(session.user.id);

  const sale = await db.query.sales.findFirst({ where: eq(sales.id, saleId) });
  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
  if (sale.soldBy !== userId && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const result = await db.transaction(async (tx) => {
    const updated = await tx.update(sales).set({
      refundAmount: refundAmount,
      refundReason: refundReason ?? null,
      refundType,
    }).where(eq(sales.id, saleId)).returning() as any[];

    if (refundType === 'refund_with_return' && sale.itemId) {
      await tx.update(items).set({
        status: 'returned',
        removalDate: null,
        updatedAt: new Date(),
      }).where(eq(items.id, sale.itemId));
    }

    return updated[0];
  });

  return NextResponse.json(result);
});