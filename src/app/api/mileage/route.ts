import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination } from '@/lib/api-utils';
import { canViewAllData } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { createMileageSchema } from '@/lib/validations';
import { eq, gte, lte, desc, sql, and } from 'drizzle-orm';

export const GET = withAuth(async (req, ctx, session) => {
  const url = new URL(req.url);
  const { page, pageSize, offset } = parsePagination(url.searchParams);
  const userId = parseInt(session.user.id);
  const viewAll = canViewAllData(session);

  const conditions = viewAll ? [] : [eq(mileage.ownerId, userId)];

  const startDate = url.searchParams.get('startDate');
  if (startDate) conditions.push(gte(mileage.date, new Date(startDate)));

  const endDate = url.searchParams.get('endDate');
  if (endDate) conditions.push(lte(mileage.date, new Date(endDate)));

  const result = await db.query.mileage.findMany({
    where: conditions.length > 0 ? (mileage, { and }) => and(...conditions) : undefined,
    limit: pageSize,
    offset,
    orderBy: desc(mileage.date),
  });

  const countResult = viewAll
    ? await db.select({ count: sql`count(*)` }).from(mileage)
    : await db.select({ count: sql`count(*)` }).from(mileage).where(eq(mileage.ownerId, userId));
  const total = Number(countResult[0].count);
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({
    mileage: result,
    pagination: { page, pageSize, total, totalPages },
  });
});

export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = createMileageSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
      { status: 400 }
    );
  }

  const entry = await db.insert(mileage).values({
    ...validation.data,
    date: new Date(validation.data.date),
    ownerId: parseInt(session.user.id),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning() as any[];

  return NextResponse.json(entry[0], { status: 201 });
});