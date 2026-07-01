import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, parseDateRange, buildPaginationResponse } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { createMileageSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

/**
 * GET /api/mileage
 * List mileage entries (user sees only their own)
 */
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const { searchParams } = new URL(req.url);
    const { page, pageSize, offset } = parsePagination(searchParams);
    const { startDate, endDate } = parseDateRange(searchParams);

    // Build where conditions
    const conditions = [eq(mileage.ownerId, parseInt(session.user.id))];

    // Date range filter
    if (startDate) {
      conditions.push(gte(mileage.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(mileage.date, endDate));
    }

    const whereClause = and(...conditions);

    // Get total count
    const allEntries = await db.query.mileage.findMany({
      where: whereClause,
    });

    // Get paginated entries
    const entries = await db.query.mileage.findMany({
      where: whereClause,
      orderBy: desc(mileage.date),
      limit: pageSize,
      offset,
    });

    return NextResponse.json({
      entries,
      pagination: buildPaginationResponse(page, pageSize, allEntries.length),
    });
  })(req);
}

/**
 * POST /api/mileage
 * Create a new mileage entry
 */
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const validation = createMileageSchema.safeParse(body);

    if (!validation.success) {
      throw ApiErrors.ValidationError(
        'Validation failed',
        validation.error.issues.map(i => i.message)
      );
    }

    const [entry] = await db.insert(mileage).values({
      ...validation.data,
      ownerId: parseInt(session.user.id),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(entry, { status: 201 });
  })(req);
}
