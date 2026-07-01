import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { createMileageSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { eq, and, gte, lte, desc, asc, count, sql } from 'drizzle-orm';
import { nowTimestamp, toTimestamp } from '@/lib/utils';
import type { Session } from 'next-auth';

export const GET = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize, offset, limit } = parsePagination(searchParams);
  const { field, order } = parseSortParams(searchParams, ['date', 'miles', 'createdAt'], 'date');

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const conditions = [eq(mileage.ownerId, parseInt(session.user.id, 10))];
  if (startDate) conditions.push(gte(mileage.date, toTimestamp(startDate)));
  if (endDate) conditions.push(lte(mileage.date, toTimestamp(endDate)));

  const where = and(...conditions);
  const sortCol = field === 'miles' ? mileage.miles : field === 'createdAt' ? mileage.createdAt : mileage.date;
  const orderBy = order === 'asc' ? asc(sortCol) : desc(sortCol);

  const [data, [{ total }]] = await Promise.all([
    db.query.mileage.findMany({ where, orderBy, limit, offset }),
    db.select({ total: count() }).from(mileage).where(where),
  ]);

  return NextResponse.json({
    mileage: data,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

export const POST = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = createMileageSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 },
    );
  }

  const now = nowTimestamp();
  const entry = await db.insert(mileage).values({
    date: toTimestamp(validation.data.date),
    miles: validation.data.miles,
    fromLocation: validation.data.fromLocation ?? null,
    toLocation: validation.data.toLocation ?? null,
    address: validation.data.address ?? null,
    vehicle: validation.data.vehicle ?? null,
    purpose: validation.data.purpose ?? null,
    ownerId: parseInt(session.user.id, 10),
    createdAt: now,
    updatedAt: now,
  }).returning();

  return NextResponse.json(entry[0], { status: 201 });
});