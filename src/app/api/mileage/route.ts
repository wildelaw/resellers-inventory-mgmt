import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, lte, asc, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, paginationEnvelope } from '@/lib/api-utils';
import { sessionUserId } from '@/lib/auth-utils';
import { createMileageSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';

const SORT_FIELDS = ['date', 'miles', 'createdAt'];

export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const sp = req.nextUrl.searchParams;
    const { page, pageSize, offset } = parsePagination(sp);
    const { sortBy, sortOrder } = parseSortParams(sp, SORT_FIELDS, 'date');

    // Mileage: own entries only (per spec).
    const uid = sessionUserId(session);
    const conditions = [eq(mileage.ownerId, uid)];
    const startDate = sp.get('startDate');
    if (startDate) {
      const ts = Math.floor(new Date(startDate).getTime() / 1000);
      if (!isNaN(ts)) conditions.push(gte(mileage.date, ts));
    }
    const endDate = sp.get('endDate');
    if (endDate) {
      const ts = Math.floor(new Date(endDate).getTime() / 1000) + 86400;
      if (!isNaN(ts)) conditions.push(lte(mileage.date, ts));
    }

    const where = and(...conditions);
    const orderFn = sortOrder === 'asc' ? asc : desc;
    const sortCol = sortBy === 'miles' ? mileage.miles : sortBy === 'createdAt' ? mileage.createdAt : mileage.date;

    const [rows, countResult] = await Promise.all([
      db.query.mileage.findMany({
        where,
        orderBy: [orderFn(sortCol)],
        limit: pageSize,
        offset,
      }),
      db.select({ c: sql<number>`count(*)` }).from(mileage).where(where).get(),
    ]);

    const total = countResult?.c ?? 0;
    return NextResponse.json({
      mileage: rows,
      pagination: paginationEnvelope(page, pageSize, total),
    });
  })(req, { params: Promise.resolve({}) });
}

export async function POST(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = createMileageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const uid = sessionUserId(session);
    const now = Math.floor(Date.now() / 1000);
    const created = db.insert(mileage).values({
      ...parsed.data,
      ownerId: uid,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(created[0], { status: 201 });
  })(req, { params: Promise.resolve({}) });
}
