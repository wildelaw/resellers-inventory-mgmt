import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, buildPagination } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { createMileageSchema } from '@/lib/validations';
import { canViewAllData } from '@/lib/auth-utils';
import { eq, desc, gte, lte, and } from 'drizzle-orm';
import { mileageToCsv, csvDownloadHeaders } from '@/lib/csv';

export async function GET(req: NextRequest) {
  return withAuth(req, async (session) => {
    const { page, pageSize, offset } = parsePagination(req.nextUrl.searchParams);
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');
    const conditions = [];
    if (!canViewAllData(session)) conditions.push(eq(mileage.ownerId, session.user.id));
    if (startDate) conditions.push(gte(mileage.date, Math.floor(new Date(startDate).getTime() / 1000)));
    if (endDate) conditions.push(lte(mileage.date, Math.floor(new Date(endDate).getTime() / 1000)));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const entries = await db.query.mileage.findMany({ where, orderBy: desc(mileage.date), limit: pageSize, offset });
    return NextResponse.json({ mileage: entries, pagination: buildPagination(page, pageSize, entries.length) });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const body = await req.json();
    const validation = createMileageSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    const now = Math.floor(Date.now() / 1000);
    const entry = await db.insert(mileage).values({ ...validation.data, ownerId: session.user.id, createdAt: now, updatedAt: now }).returning() as any[];
    return NextResponse.json({ mileage: entry[0] }, { status: 201 });
  });
}
