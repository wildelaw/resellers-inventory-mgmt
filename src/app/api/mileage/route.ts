import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, escapeLike, paginateResults } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { createMileageSchema } from '@/lib/validations';
import { canViewAllData } from '@/lib/auth-utils';
import { eq, and, like, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { parseDateParam } from '@/lib/utils';

export const GET = withAuth(async (req, _ctx, session) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize, offset } = parsePagination(searchParams);
  const { field: sortField, direction: sortDirection } = parseSortParams(
    searchParams,
    ['date', 'miles', 'vehicle', 'createdAt'],
    'date'
  );

  const viewAll = canViewAllData(session);
  const conditions = [];

  if (!viewAll) {
    conditions.push(eq(mileage.ownerId, Number(session.user.id)));
  }

  const vehicle = searchParams.get('vehicle');
  const purpose = searchParams.get('purpose');
  const dateFrom = parseDateParam(searchParams.get('dateFrom'));
  const dateTo = parseDateParam(searchParams.get('dateTo'));
  const search = searchParams.get('search');

  if (vehicle) {
    conditions.push(eq(mileage.vehicle, vehicle));
  }
  if (purpose) {
    conditions.push(eq(mileage.purpose, purpose));
  }
  if (dateFrom !== null) {
    conditions.push(gte(mileage.date, dateFrom));
  }
  if (dateTo !== null) {
    conditions.push(lte(mileage.date, dateTo));
  }
  if (search) {
    conditions.push(like(mileage.fromLocation, `%${escapeLike(search)}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn = sortField === 'date' ? mileage.date
    : sortField === 'miles' ? mileage.miles
    : sortField === 'vehicle' ? mileage.vehicle
    : mileage.createdAt;
  const orderByClause = sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [result, countResult] = await Promise.all([
    db.select().from(mileage).where(whereClause).orderBy(orderByClause).limit(pageSize).offset(offset).all(),
    db.select({ count: sql<number>`count(*)` }).from(mileage).where(whereClause).get(),
  ]);

  const total = countResult?.count ?? 0;

  return NextResponse.json(paginateResults(result, total, page, pageSize));
});

export const POST = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = createMileageSchema.parse(body);

  const result = await db.insert(mileage).values({
    ...parsed,
    ownerId: Number(session.user.id),
  }).returning().get();

  return NextResponse.json(result, { status: 201 });
});