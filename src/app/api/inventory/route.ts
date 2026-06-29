import { NextResponse } from 'next/server';
import { and, eq, gte, lte, like, or, desc, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, paginationMeta, likeContains } from '@/lib/api-utils';
import { canViewAllData, currentUserId } from '@/lib/auth-utils';
import { createItemSchema } from '@/lib/validations';
import { ALL_STATUSES } from '@/lib/constants';
import type { ItemStatus } from '@/lib/constants';
import { nowTs } from '@/lib/schema';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'purchaseDate', 'purchasePrice', 'name', 'status'];

export const GET = withAuth(async (req, _ctx, session) => {
  const sp = req.nextUrl.searchParams;
  const { limit, offset, page, pageSize } = parsePagination(sp);
  const { sortBy, sortOrder } = parseSortParams(sp, SORT_FIELDS, 'createdAt');

  const status = sp.get('status') ?? undefined;
  const category = sp.get('category') ?? undefined;
  const search = sp.get('search') ?? undefined;
  const startTs = sp.get('startDate') ? new Date(sp.get('startDate') as string).getTime() / 1000 : null;
  const endTs = sp.get('endDate') ? new Date(sp.get('endDate') as string).getTime() / 1000 : null;

  const uid = currentUserId(session);
  const viewAll = canViewAllData(session);

  const conditions = [];
  if (!viewAll) conditions.push(eq(items.ownerId, uid));
  if (status && ALL_STATUSES.includes(status as ItemStatus)) conditions.push(eq(items.status, status as ItemStatus));
  if (category) conditions.push(eq(items.category, category));
  if (startTs) conditions.push(gte(items.purchaseDate, Math.floor(startTs)));
  if (endTs) conditions.push(lte(items.purchaseDate, Math.floor(endTs)));
  if (search) {
    const term = likeContains(search);
    conditions.push(or(like(items.name, term), like(items.description, term), like(items.purchaseLocation, term)) ?? eq(items.id, 0));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const sortCol =
    sortBy === 'purchasePrice' ? items.purchasePrice
    : sortBy === 'purchaseDate' ? items.purchaseDate
    : sortBy === 'name' ? items.name
    : sortBy === 'status' ? items.status
    : sortBy === 'updatedAt' ? items.updatedAt
    : items.createdAt;
  const orderFn = sortOrder === 'asc' ? asc : desc;

  const total = db.select({ c: sql<number>`count(*)` }).from(items).where(where).get()?.c ?? 0;
  const rows = db.query.items.findMany({
    where,
    with: { photos: true, sales: true },
    orderBy: [orderFn(sortCol)],
    limit,
    offset,
  }).sync();

  const categoryRows = db.select({ category: items.category }).from(items)
    .where(viewAll ? undefined : eq(items.ownerId, uid))
    .all()
    .map((r) => r.category)
    .filter((c): c is string => Boolean(c));
  const uniqueCategories = Array.from(new Set(categoryRows)).sort();

  return NextResponse.json({
    items: rows,
    pagination: paginationMeta(page, pageSize, total),
    categories: uniqueCategories,
  });
});

export const POST = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const { name, description, purchaseDate, purchasePrice, purchaseLocation, category, status, notes, metadata } = parsed.data;
  const ts = nowTs();
  const [item] = db.insert(items).values({
    name,
    description: description ?? null,
    purchaseDate: purchaseDate as number,
    purchasePrice,
    purchaseLocation: purchaseLocation ?? null,
    category: category ?? null,
    status: status ?? 'available',
    notes: notes ?? null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    ownerId: currentUserId(session),
    createdAt: ts,
    updatedAt: ts,
  }).returning().all();

  return NextResponse.json(item, { status: 201 });
});