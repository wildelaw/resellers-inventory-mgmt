import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams } from '@/lib/api-utils';
import { createItemSchema } from '@/lib/validations';
import { toTimestamp } from '@/lib/utils';
import { ApiErrors } from '@/lib/api-errors';
import { listInventory, parseInventoryFilters } from '@/lib/inventory-queries';
import { paginationResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// GET /api/inventory — list items
export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const sp = req.nextUrl.searchParams;
    const pagination = parsePagination(sp);
    const sort = parseSortParams(sp, ['createdAt', 'updatedAt', 'name', 'purchaseDate', 'purchasePrice', 'status'], 'createdAt');
    const filter = parseInventoryFilters(sp);
    const { rows, total, categories } = await listInventory(session, pagination, sort, filter);
    return NextResponse.json({
      items: rows,
      pagination: paginationResponse(pagination.page, pagination.pageSize, total),
      categories,
    });
  })(req, { params: Promise.resolve({}) });
}

// POST /api/inventory — create item
export async function POST(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }
    const data = parsed.data;
    const purchaseTs = toTimestamp(data.purchaseDate);
    if (purchaseTs === null) {
      return ApiErrors.BadRequest('Invalid purchaseDate').toResponse();
    }
    const now = Date.now();
    const metadataStr = data.metadata === null || data.metadata === undefined
      ? null
      : typeof data.metadata === 'string'
        ? data.metadata
        : JSON.stringify(data.metadata);

    const created = db
      .insert(items)
      .values({
        name: data.name,
        description: data.description ?? null,
        purchaseDate: purchaseTs,
        purchasePrice: data.purchasePrice,
        purchaseLocation: data.purchaseLocation ?? null,
        category: data.category ?? null,
        status: 'available',
        notes: data.notes ?? null,
        metadata: metadataStr,
        ownerId: Number(session.user.id),
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return NextResponse.json(created, { status: 201 });
  })(req, { params: Promise.resolve({}) });
}