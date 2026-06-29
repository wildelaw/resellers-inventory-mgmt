import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, paginationResponse } from '@/lib/api-utils';
import { createMileageSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { dateParamToTimestamp, toTimestamp } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const SORT_FIELDS = ['date', 'miles', 'createdAt', 'updatedAt'] as const;
type SortField = (typeof SORT_FIELDS)[number];

function sortColumn(field: SortField) {
  switch (field) {
    case 'miles': return mileage.miles;
    case 'createdAt': return mileage.createdAt;
    case 'updatedAt': return mileage.updatedAt;
    case 'date':
    default: return mileage.date;
  }
}

// GET /api/mileage — own entries only
export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const sp = req.nextUrl.searchParams;
    const pagination = parsePagination(sp);
    const sort = parseSortParams(sp, ['date', 'miles', 'createdAt', 'updatedAt'], 'date');
    const startDate = dateParamToTimestamp(sp.get('startDate'));
    const endDate = dateParamToTimestamp(sp.get('endDate'));

    const conditions = [eq(mileage.ownerId, Number(session.user.id))];
    if (startDate !== null) conditions.push(gte(mileage.date, startDate));
    if (endDate !== null) conditions.push(lte(mileage.date, endDate));
    const where = and(...conditions);

    const orderBy = sort.sortOrder === 'asc'
      ? asc(sortColumn(sort.sortBy as SortField))
      : desc(sortColumn(sort.sortBy as SortField));

    const rows = db.select().from(mileage).where(where).orderBy(orderBy)
      .limit(pagination.limit).offset(pagination.offset).all();
    const total = await db.$count(mileage, where);
    return NextResponse.json({
      items: rows,
      pagination: paginationResponse(pagination.page, pagination.pageSize, total),
    });
  })(req, { params: Promise.resolve({}) });
}

// POST /api/mileage
export async function POST(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = createMileageSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }
    const data = parsed.data;
    const ts = toTimestamp(data.date);
    if (ts === null) return ApiErrors.BadRequest('Invalid date').toResponse();

    const now = Date.now();
    const created = db
      .insert(mileage)
      .values({
        date: ts,
        miles: data.miles,
        fromLocation: data.fromLocation ?? null,
        toLocation: data.toLocation ?? null,
        address: data.address ?? null,
        vehicle: data.vehicle ?? null,
        purpose: data.purpose ?? null,
        ownerId: Number(session.user.id),
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return NextResponse.json(created, { status: 201 });
  })(req, { params: Promise.resolve({}) });
}