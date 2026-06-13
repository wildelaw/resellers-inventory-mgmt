import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, escapeLike } from '@/lib/api-utils';
import { canViewAllData } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, photos, sales } from '@/lib/schema';
import { createItemSchema } from '@/lib/validations';
import { eq, and, or, like, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { ALLOWED_TRANSITIONS } from '@/lib/constants';

export const GET = withAuth(async (req, ctx, session) => {
  const url = new URL(req.url);
  const { page, pageSize, offset } = parsePagination(url.searchParams);
  const sortBy = parseSortParams(url.searchParams, ['name', 'purchaseDate', 'purchasePrice', 'status', 'createdAt'], 'createdAt');

  const conditions = [];
  if (!canViewAllData(session)) {
    conditions.push(eq(items.ownerId, parseInt(session.user.id)));
  }

  const status = url.searchParams.get('status');
  if (status) conditions.push(eq(items.status, status as any));

  const category = url.searchParams.get('category');
  if (category) conditions.push(eq(items.category, category));

  const search = url.searchParams.get('search');
  if (search) {
    const term = escapeLike(search);
    conditions.push(or(
      like(items.name, `%${term}%`),
      like(items.description, `%${term}%`),
      like(items.purchaseLocation, `%${term}%`)
    )!);
  }

  const startDate = url.searchParams.get('startDate');
  if (startDate) conditions.push(gte(items.purchaseDate, new Date(startDate)));

  const endDate = url.searchParams.get('endDate');
  if (endDate) conditions.push(lte(items.purchaseDate, new Date(endDate)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderBy = sortBy.direction === 'asc'
    ? asc((items as any)[sortBy.field])
    : desc((items as any)[sortBy.field]);

  const [result, countResult, categories] = await Promise.all([
    db.query.items.findMany({
      where,
      with: { photos: true, sales: true },
      limit: pageSize,
      offset,
      orderBy: sortBy.field === 'createdAt' ? (sortBy.direction === 'desc' ? desc(items.createdAt) : asc(items.createdAt)) : orderBy,
    }),
    db.select({ count: sql<number>`count(*)` }).from(items).where(where),
    db.selectDistinct({ category: items.category }).from(items).where(where).orderBy(items.category),
  ]);

  const total = Number(countResult[0].count);
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({
    items: result,
    pagination: { page, pageSize, total, totalPages },
    categories: categories.map(c => c.category).filter(Boolean),
  });
});

export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = createItemSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
      { status: 400 }
    );
  }

  const item = await db.insert(items).values({
    ...validation.data,
    purchaseDate: new Date(validation.data.purchaseDate),
    ownerId: parseInt(session.user.id),
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning() as any[];

  return NextResponse.json(item[0], { status: 201 });
});