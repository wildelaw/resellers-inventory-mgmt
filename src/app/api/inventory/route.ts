import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, escapeLike, buildPagination } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { createItemSchema } from '@/lib/validations';
import { eq, and, or, like, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { canViewAllData } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  return withAuth(req, async (session) => {
    const { page, pageSize, offset } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get('status');
    const category = req.nextUrl.searchParams.get('category');
    const search = req.nextUrl.searchParams.get('search');
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');

    const conditions = [];
    if (!canViewAllData(session)) conditions.push(eq(items.ownerId, session.user.id));
    if (status) conditions.push(eq(items.status, status as any));
    if (category) conditions.push(eq(items.category, category));
    if (search) { const term = `%${escapeLike(search)}%`; conditions.push(or(like(items.name, term), like(items.description, term), like(items.purchaseLocation, term))!); }
    if (startDate) conditions.push(gte(items.purchaseDate, Math.floor(new Date(startDate).getTime() / 1000)));
    if (endDate) conditions.push(lte(items.purchaseDate, Math.floor(new Date(endDate).getTime() / 1000)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(items).where(where);
    const total = countResult[0].count;
    const itemRows = await db.query.items.findMany({ where, with: { photos: true }, orderBy: desc(items.createdAt), limit: pageSize, offset });
    const categories = await db.selectDistinct({ category: items.category }).from(items).where(sql`${items.category} IS NOT NULL`);

    return NextResponse.json({ items: itemRows, pagination: buildPagination(page, pageSize, total), categories: categories.map(c => c.category).filter(Boolean) });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const body = await req.json();
    const validation = createItemSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    const now = Math.floor(Date.now() / 1000);
    const { metadata, ...rest } = validation.data;
    const item = await db.insert(items).values({ ...rest, metadata: metadata ? JSON.stringify(metadata) : null, ownerId: session.user.id, status: 'available', createdAt: now, updatedAt: now }).returning() as any[];
    return NextResponse.json(item[0], { status: 201 });
  });
}
