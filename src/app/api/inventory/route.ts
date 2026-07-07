import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, users } from '@/lib/schema';
import { eq, and, gte, lte, like, or, sql, desc, asc } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, parseDateFilters, escapeLike, paginatedResponse } from '@/lib/api-utils';
import { canViewAllData } from '@/lib/auth-utils';
import { createItemSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { nowTimestamp, toTimestamp } from '@/lib/utils';

// GET - List items
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    try {
      const { searchParams } = new URL(req.url);
      const { page, pageSize, offset, limit } = parsePagination(searchParams);
      const { sortBy, sortOrder } = parseSortParams(searchParams, ['createdAt', 'purchaseDate', 'name', 'purchasePrice', 'updatedAt'], 'createdAt');
      const { startDate, endDate } = parseDateFilters(searchParams);

      const status = searchParams.get('status') || undefined;
      const category = searchParams.get('category') || undefined;
      const search = searchParams.get('search') || undefined;

      // Build where conditions
      const conditions = [];

      // RBAC: non-admin/non-canViewAll users only see own items
      if (!canViewAllData(session)) {
        conditions.push(eq(items.ownerId, Number(session.user.id)));
      }

      if (status) {
        conditions.push(eq(items.status, status as any));
      }
      if (category) {
        conditions.push(eq(items.category, category));
      }
      if (search) {
        const escaped = escapeLike(search);
        conditions.push(
          or(
            like(items.name, `%${escaped}%`),
            like(items.description, `%${escaped}%`),
            like(items.purchaseLocation, `%${escaped}%`)
          )!
        );
      }
      if (startDate) {
        conditions.push(gte(items.purchaseDate, startDate));
      }
      if (endDate) {
        conditions.push(lte(items.purchaseDate, endDate));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(items)
        .where(where);
      const total = countResult[0]?.count ?? 0;

      // Get items
      const sortColumn = sortBy === 'purchaseDate' ? items.purchaseDate
        : sortBy === 'name' ? items.name
        : sortBy === 'purchasePrice' ? items.purchasePrice
        : sortBy === 'updatedAt' ? items.updatedAt
        : items.createdAt;

      const result = await db.query.items.findMany({
        where,
        with: {
          photos: true,
        },
        orderBy: sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn),
        limit,
        offset,
      });

      // Get unique categories
      const categoriesResult = await db.selectDistinct({ category: items.category })
        .from(items)
        .where(canViewAllData(session) ? undefined : eq(items.ownerId, Number(session.user.id)));
      const categories = categoriesResult.map(c => c.category).filter(Boolean) as string[];

      return NextResponse.json({
        ...paginatedResponse(result, total, page, pageSize),
        categories,
      });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}

// POST - Create item
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const body = await req.json();
      const validation = createItemSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
          { status: 400 }
        );
      }

      const data = validation.data;
      const now = nowTimestamp();

      const newItem = await db.insert(items).values({
        name: data.name,
        description: data.description || null,
        purchaseDate: toTimestamp(data.purchaseDate),
        purchasePrice: Number(data.purchasePrice),
        purchaseLocation: data.purchaseLocation || null,
        category: data.category || null,
        status: 'available',
        notes: data.notes || null,
        metadata: data.metadata || null,
        ownerId: Number(session.user.id),
        createdAt: now,
        updatedAt: now,
      }).returning();

      return NextResponse.json(newItem[0], { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}