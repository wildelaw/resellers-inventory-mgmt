import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, lte, like, or, asc, desc, sql, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { items, photos, sales, users } from '@/lib/schema';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, escapeLike, paginationEnvelope } from '@/lib/api-utils';
import { canViewAllData, sessionUserId } from '@/lib/auth-utils';
import { createItemSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';

const SORT_FIELDS = ['createdAt', 'purchaseDate', 'name', 'purchasePrice', 'status'];

export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const sp = req.nextUrl.searchParams;
    const { page, pageSize, offset } = parsePagination(sp);
    const { sortBy, sortOrder } = parseSortParams(sp, SORT_FIELDS, 'createdAt');

    const viewAll = canViewAllData(session);
    const uid = sessionUserId(session);

    const conditions = [];
    if (!viewAll) conditions.push(eq(items.ownerId, uid));
    const status = sp.get('status');
    if (status) conditions.push(eq(items.status, status as typeof items.status.enumValues));
    const category = sp.get('category');
    if (category) conditions.push(eq(items.category, category));
    const search = sp.get('search');
    if (search) {
      const pat = `%${escapeLike(search)}%`;
      conditions.push(or(like(items.name, pat), like(items.description, pat), like(items.purchaseLocation, pat))!);
    }
    const startDate = sp.get('startDate');
    if (startDate) {
      const ts = Math.floor(new Date(startDate).getTime() / 1000);
      if (!isNaN(ts)) conditions.push(gte(items.purchaseDate, ts));
    }
    const endDate = sp.get('endDate');
    if (endDate) {
      const ts = Math.floor(new Date(endDate).getTime() / 1000) + 86400;
      if (!isNaN(ts)) conditions.push(lte(items.purchaseDate, ts));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const orderFn = sortOrder === 'asc' ? asc : desc;
    const sortCol =
      sortBy === 'purchaseDate' ? items.purchaseDate :
      sortBy === 'name' ? items.name :
      sortBy === 'purchasePrice' ? items.purchasePrice :
      sortBy === 'status' ? items.status : items.createdAt;

    const [rows, countResult, cats] = await Promise.all([
      db.query.items.findMany({
        where,
        with: { photos: true },
        orderBy: [orderFn(sortCol)],
        limit: pageSize,
        offset,
      }),
      db.select({ c: sql<number>`count(*)` }).from(items).where(where ?? sql`1=1`).get(),
      db.select({ category: items.category }).from(items).where(where ?? sql`1=1`).groupBy(items.category),
    ]);

    const total = countResult?.c ?? 0;
    const categories = cats.map((c) => c.category).filter(Boolean) as string[];

    return NextResponse.json({
      items: rows,
      pagination: paginationEnvelope(page, pageSize, total),
      categories,
    });
  })(req, { params: Promise.resolve({}) });
}

export async function POST(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const uid = sessionUserId(session);
    const now = Math.floor(Date.now() / 1000);
    const created = db
      .insert(items)
      .values({
        ...parsed.data,
        ownerId: uid,
        status: 'available',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(created[0], { status: 201 });
  })(req, { params: Promise.resolve({}) });
}
