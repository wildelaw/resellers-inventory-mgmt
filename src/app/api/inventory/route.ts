import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, escapeLike, paginateResults } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { createItemSchema } from '@/lib/validations';
import { canViewAllData } from '@/lib/auth-utils';
import { eq, and, like, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { parseDateParam } from '@/lib/utils';
import type { ItemStatus } from '@/lib/constants';

export const GET = withAuth(async (req, _ctx, session) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize, offset } = parsePagination(searchParams);
  const { field: sortField, direction: sortDirection } = parseSortParams(
    searchParams,
    ['name', 'purchaseDate', 'purchasePrice', 'status', 'createdAt', 'updatedAt'],
    'createdAt'
  );

  const statusParam = searchParams.get('status') as ItemStatus | null;
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const dateFrom = parseDateParam(searchParams.get('dateFrom'));
  const dateTo = parseDateParam(searchParams.get('dateTo'));

  const viewAll = canViewAllData(session);
  const conditions = [];

  if (!viewAll) {
    conditions.push(eq(items.ownerId, Number(session.user.id)));
  }

  if (statusParam) {
    conditions.push(eq(items.status, statusParam));
  }
  if (category) {
    conditions.push(eq(items.category, category));
  }
  if (search) {
    conditions.push(like(items.name, `%${escapeLike(search)}%`));
  }
  if (dateFrom !== null) {
    conditions.push(gte(items.purchaseDate, dateFrom));
  }
  if (dateTo !== null) {
    conditions.push(lte(items.purchaseDate, dateTo));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn = sortField === 'name' ? items.name
    : sortField === 'purchaseDate' ? items.purchaseDate
    : sortField === 'purchasePrice' ? items.purchasePrice
    : sortField === 'status' ? items.status
    : sortField === 'updatedAt' ? items.updatedAt
    : items.createdAt;

  const orderByClause = sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [result, countResult] = await Promise.all([
    db.select().from(items).where(whereClause).orderBy(orderByClause).limit(pageSize).offset(offset).all(),
    db.select({ count: sql<number>`count(*)` }).from(items).where(whereClause).get(),
  ]);

  const total = countResult?.count ?? 0;

  return NextResponse.json(paginateResults(result, total, page, pageSize));
});

export const POST = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = createItemSchema.parse(body);

  const result = await db.insert(items).values({
    ...parsed,
    ownerId: Number(session.user.id),
  }).returning().get();

  return NextResponse.json(result, { status: 201 });
});