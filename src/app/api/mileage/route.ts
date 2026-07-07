import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, and, gte, lte, sql, desc, asc } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, parseDateFilters, paginatedResponse } from '@/lib/api-utils';
import { createMileageSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { nowTimestamp, toTimestamp } from '@/lib/utils';

// GET - List mileage
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    try {
      const { searchParams } = new URL(req.url);
      const { page, pageSize, offset, limit } = parsePagination(searchParams);
      const { sortBy, sortOrder } = parseSortParams(searchParams, ['date', 'miles', 'createdAt'], 'date');
      const { startDate, endDate } = parseDateFilters(searchParams);

      const conditions = [eq(mileage.ownerId, Number(session.user.id))];

      if (startDate) conditions.push(gte(mileage.date, startDate));
      if (endDate) conditions.push(lte(mileage.date, endDate));

      const where = and(...conditions);

      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(mileage)
        .where(where);
      const total = countResult[0]?.count ?? 0;

      const sortColumn = sortBy === 'date' ? mileage.date
        : sortBy === 'miles' ? mileage.miles
        : mileage.createdAt;

      const result = await db.query.mileage.findMany({
        where,
        orderBy: sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn),
        limit,
        offset,
      });

      return NextResponse.json(paginatedResponse(result, total, page, pageSize));
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}

// POST - Create mileage entry
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const body = await req.json();
      const validation = createMileageSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
          { status: 400 }
        );
      }

      const data = validation.data;
      const now = nowTimestamp();

      const newEntry = await db.insert(mileage).values({
        date: toTimestamp(data.date),
        miles: Number(data.miles),
        fromLocation: data.fromLocation || null,
        toLocation: data.toLocation || null,
        address: data.address || null,
        vehicle: data.vehicle || null,
        purpose: data.purpose || null,
        ownerId: Number(session.user.id),
        createdAt: now,
        updatedAt: now,
      }).returning();

      return NextResponse.json(newEntry[0], { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}