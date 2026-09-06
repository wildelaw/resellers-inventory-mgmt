import { NextResponse, type NextRequest } from 'next/server';
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, readJsonBody, parsePagination, parseSortParams, parseDateRange } from '@/lib/api-utils';
import { sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { createMileageSchema } from '@/lib/validations';

const SORT_FIELDS = ['date', 'miles', 'createdAt'];

// GET /api/mileage — own entries only, date-range filterable
export const GET = withAuth(async (req, ctx, session) => {
  const searchParams = req.nextUrl.searchParams;
  const { page, pageSize, offset } = parsePagination(searchParams);
  const sort = parseSortParams(searchParams, SORT_FIELDS, 'date');
  const { startDate, endDate } = parseDateRange(searchParams);

  const conditions = [eq(mileage.ownerId, sessionUserId(session))];
  if (startDate) conditions.push(gte(mileage.date, startDate));
  if (endDate) conditions.push(lte(mileage.date, endDate));
  const where = and(...conditions);

  const sortColumn = {
    date: mileage.date,
    miles: mileage.miles,
    createdAt: mileage.createdAt,
  }[sort.field] ?? mileage.date;

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(mileage).where(where)
      .orderBy(sort.order === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(mileage).where(where),
  ]);

  const total = Number(count);
  return NextResponse.json({
    items: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
});

// POST /api/mileage — create entry for the current user
export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await readJsonBody(req);
  const validation = createMileageSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 }
    );
  }

  const now = new Date();
  const inserted = await db.insert(mileage).values({
    ...validation.data,
    ownerId: sessionUserId(session),
    createdAt: now,
    updatedAt: now,
  }).returning();

  return NextResponse.json(inserted[0], { status: 201 });
});