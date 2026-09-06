import { NextResponse, type NextRequest } from 'next/server';
import { and, asc, desc, eq, gte, lte, or, sql } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, readJsonBody, parsePagination, parseSortParams, parseDateRange, escapeLike } from '@/lib/api-utils';
import { canViewAllData, sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { createItemSchema } from '@/lib/validations';
import type { ItemStatus } from '@/lib/constants';

const SORT_FIELDS = ['createdAt', 'purchaseDate', 'name', 'purchasePrice', 'status'];

// GET /api/inventory — paginated, filterable, sortable item list
export const GET = withAuth(async (req, ctx, session) => {
  const searchParams = req.nextUrl.searchParams;
  const { page, pageSize, offset } = parsePagination(searchParams);
  const sort = parseSortParams(searchParams, SORT_FIELDS, 'createdAt');
  const { startDate, endDate } = parseDateRange(searchParams);

  const conditions = [];

  // RBAC: standard users see only their own items
  if (!canViewAllData(session)) {
    conditions.push(eq(items.ownerId, sessionUserId(session)));
  }

  const status = searchParams.get('status') as ItemStatus | null;
  if (status) conditions.push(eq(items.status, status));

  const category = searchParams.get('category');
  if (category) conditions.push(eq(items.category, category));

  const search = searchParams.get('search');
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    conditions.push(or(
      sql`${items.name} LIKE ${pattern} ESCAPE '\\'`,
      sql`${items.description} LIKE ${pattern} ESCAPE '\\'`,
      sql`${items.purchaseLocation} LIKE ${pattern} ESCAPE '\\'`
    ));
  }

  if (startDate) conditions.push(gte(items.purchaseDate, startDate));
  if (endDate) conditions.push(lte(items.purchaseDate, endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn = {
    createdAt: items.createdAt,
    purchaseDate: items.purchaseDate,
    name: items.name,
    purchasePrice: items.purchasePrice,
    status: items.status,
  }[sort.field] ?? items.createdAt;

  const [rows, [{ count }], categoryRows] = await Promise.all([
    db.query.items.findMany({
      where,
      with: { photos: true, sales: true },
      orderBy: [sort.order === 'asc' ? asc(sortColumn) : desc(sortColumn)],
      limit: pageSize,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(items).where(where),
    db.selectDistinct({ category: items.category }).from(items).where(
      canViewAllData(session) ? undefined : eq(items.ownerId, sessionUserId(session))
    ),
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
    categories: categoryRows.map((r) => r.category).filter((c): c is string => c !== null).sort(),
  });
});

// POST /api/inventory — create item (owned by the current user)
export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await readJsonBody(req);
  const validation = createItemSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 }
    );
  }

  const now = new Date();
  const inserted = await db.insert(items).values({
    ...validation.data,
    ownerId: sessionUserId(session),
    status: 'available',
    createdAt: now,
    updatedAt: now,
  }).returning();

  return NextResponse.json(inserted[0], { status: 201 });
});