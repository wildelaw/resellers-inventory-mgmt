import { NextResponse } from 'next/server';
import { and, eq, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mileage, nowTs } from '@/lib/schema';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, paginationMeta } from '@/lib/api-utils';
import { currentUserId } from '@/lib/auth-utils';
import { createMileageSchema } from '@/lib/validations';

const SORT_FIELDS = ['date', 'miles', 'createdAt'];

export const GET = withAuth(async (req, _ctx, session) => {
  const sp = req.nextUrl.searchParams;
  const { limit, offset, page, pageSize } = parsePagination(sp);
  const { sortBy, sortOrder } = parseSortParams(sp, SORT_FIELDS, 'date');

  const startTs = sp.get('startDate') ? new Date(sp.get('startDate') as string).getTime() / 1000 : null;
  const endTs = sp.get('endDate') ? new Date(sp.get('endDate') as string).getTime() / 1000 : null;

  const uid = currentUserId(session);
  // Mileage is own-only (admin sees all via RBAC helper).
  const viewAll = session.user.role === 'admin' || session.user.canViewAll === true;
  const conditions = [];
  if (!viewAll) conditions.push(eq(mileage.ownerId, uid));
  if (startTs) conditions.push(gte(mileage.date, Math.floor(startTs)));
  if (endTs) conditions.push(lte(mileage.date, Math.floor(endTs)));
  const where = conditions.length ? and(...conditions) : undefined;

  const sortCol = sortBy === 'miles' ? mileage.miles : sortBy === 'createdAt' ? mileage.createdAt : mileage.date;
  const orderFn = sortOrder === 'asc' ? asc : desc;

  const total = db.select({ c: sql<number>`count(*)` }).from(mileage).where(where).get()?.c ?? 0;
  const rows = db.query.mileage.findMany({ where, orderBy: [orderFn(sortCol)], limit, offset }).sync();

  return NextResponse.json({
    mileage: rows,
    pagination: paginationMeta(page, pageSize, total),
  });
});

export const POST = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = createMileageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const ts = nowTs();
  const [entry] = db.insert(mileage).values({
    date: data.date as number,
    miles: data.miles,
    fromLocation: data.fromLocation ?? null,
    toLocation: data.toLocation ?? null,
    address: data.address ?? null,
    vehicle: data.vehicle ?? null,
    purpose: data.purpose ?? null,
    ownerId: currentUserId(session),
    createdAt: ts,
    updatedAt: ts,
  }).returning().all();

  return NextResponse.json(entry, { status: 201 });
});