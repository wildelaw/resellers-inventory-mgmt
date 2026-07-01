import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, escapeLike } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { createItemSchema } from '@/lib/validations';
import { canViewAllData } from '@/lib/auth-utils';
import { isTerminalStatus, type ItemStatus } from '@/lib/constants';
import { eq, and, gte, lte, like, desc, asc, count, sql } from 'drizzle-orm';
import { nowTimestamp, toTimestamp } from '@/lib/utils';
import type { Session } from 'next-auth';

export const GET = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize, offset, limit } = parsePagination(searchParams);
  const { field, order } = parseSortParams(searchParams, ['createdAt', 'purchaseDate', 'name', 'purchasePrice', 'updatedAt'], 'createdAt');

  const status = searchParams.get('status') || undefined;
  const category = searchParams.get('category') || undefined;
  const search = searchParams.get('search') || undefined;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const conditions = [];
  if (!canViewAllData(session)) {
    conditions.push(eq(items.ownerId, parseInt(session.user.id, 10)));
  }
  if (status) conditions.push(eq(items.status, status));
  if (category) conditions.push(eq(items.category, category));
  if (search) {
    const escaped = escapeLike(search);
    conditions.push(like(items.name, `%${escaped}%`));
  }
  if (startDate) conditions.push(gte(items.purchaseDate, toTimestamp(startDate)));
  if (endDate) conditions.push(lte(items.purchaseDate, toTimestamp(endDate)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const sortCol = field === 'purchaseDate' ? items.purchaseDate
    : field === 'name' ? items.name
    : field === 'purchasePrice' ? items.purchasePrice
    : field === 'updatedAt' ? items.updatedAt
    : items.createdAt;
  const orderBy = order === 'asc' ? asc(sortCol) : desc(sortCol);

  const [data, [{ total }]] = await Promise.all([
    db.query.items.findMany({
      where,
      with: { photos: true, sales: true },
      orderBy,
      limit,
      offset,
    }),
    db.select({ total: count() }).from(items).where(where ?? sql`1=1`),
  ]);

  // Get distinct categories
  const categoryConditions = [];
  if (!canViewAllData(session)) {
    categoryConditions.push(eq(items.ownerId, parseInt(session.user.id, 10)));
  }
  const categories = await db.select({ category: items.category })
    .from(items)
    .where(and(...categoryConditions))
    .groupBy(items.category);

  return NextResponse.json({
    items: data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    categories: categories.map((c) => c.category).filter(Boolean),
  });
});

export const POST = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = createItemSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 },
    );
  }

  const now = nowTimestamp();
  const status = (validation.data.status as ItemStatus) || 'available';
  const removalDate = isTerminalStatus(status) ? now : null;

  const item = await db.insert(items).values({
    name: validation.data.name,
    description: validation.data.description ?? null,
    purchaseDate: toTimestamp(validation.data.purchaseDate),
    purchasePrice: validation.data.purchasePrice,
    purchaseLocation: validation.data.purchaseLocation ?? null,
    category: validation.data.category ?? null,
    status,
    notes: validation.data.notes ?? null,
    metadata: validation.data.metadata ? JSON.stringify(validation.data.metadata) : null,
    removalDate,
    ownerId: parseInt(session.user.id, 10),
    createdAt: now,
    updatedAt: now,
  }).returning();

  return NextResponse.json(item[0], { status: 201 });
});