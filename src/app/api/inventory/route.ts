import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, parseDateRange, buildPaginationResponse, escapeLike } from '@/lib/api-utils';
import { canViewAllData } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, photos, sales } from '@/lib/schema';
import { createItemSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { eq, and, gte, lte, like, or, desc, asc, sql } from 'drizzle-orm';

/**
 * GET /api/inventory
 * List items with filtering, sorting, and pagination
 */
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const { searchParams } = new URL(req.url);
    const { page, pageSize, offset } = parsePagination(searchParams);
    const { sortBy, sortOrder } = parseSortParams(
      searchParams,
      ['name', 'purchaseDate', 'purchasePrice', 'status', 'category', 'createdAt'],
      'createdAt'
    );
    const { startDate, endDate } = parseDateRange(searchParams);

    // Build where conditions
    const conditions = [];

    // RBAC: Standard users see only their own items
    if (!canViewAllData(session)) {
      conditions.push(eq(items.ownerId, parseInt(session.user.id)));
    }

    // Status filter
    const status = searchParams.get('status');
    if (status) {
      conditions.push(eq(items.status, status as any));
    }

    // Category filter
    const category = searchParams.get('category');
    if (category) {
      conditions.push(eq(items.category, category));
    }

    // Search filter (name, description, location)
    const search = searchParams.get('search');
    if (search) {
      const escaped = escapeLike(search);
      conditions.push(
        or(
          like(items.name, `%${escaped}%`),
          like(items.description, `%${escaped}%`),
          like(items.purchaseLocation, `%${escaped}%`)
        )
      );
    }

    // Date range filter
    if (startDate) {
      conditions.push(gte(items.purchaseDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(items.purchaseDate, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .where(whereClause);

    // Get items with photos and sales
    const validSortFields: Record<string, any> = {
      name: items.name,
      purchaseDate: items.purchaseDate,
      purchasePrice: items.purchasePrice,
      status: items.status,
      category: items.category,
      createdAt: items.createdAt,
    };
    const orderColumn = validSortFields[sortBy] || items.createdAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const itemsList = await db.query.items.findMany({
      where: whereClause,
      with: {
        photos: true,
        sales: true,
        owner: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: orderFn(orderColumn),
      limit: pageSize,
      offset,
    });

    // Get unique categories for filter dropdown
    const categoriesResult = await db
      .selectDistinct({ category: items.category })
      .from(items)
      .where(whereClause);

    const categories = categoriesResult
      .map(r => r.category)
      .filter(c => c !== null && c !== '') as string[];

    return NextResponse.json({
      items: itemsList,
      pagination: buildPaginationResponse(page, pageSize, count),
      categories,
    });
  })(req);
}

/**
 * POST /api/inventory
 * Create a new item
 */
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const validation = createItemSchema.safeParse(body);

    if (!validation.success) {
      throw ApiErrors.ValidationError(
        'Validation failed',
        validation.error.issues.map(i => i.message)
      );
    }

    const [item] = await db.insert(items).values({
      ...validation.data,
      ownerId: parseInt(session.user.id),
      status: 'available',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(item, { status: 201 });
  })(req);
}
