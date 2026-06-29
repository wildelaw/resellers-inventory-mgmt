import { db } from '@/lib/db';
import { items, photos, sales } from '@/lib/schema';
import { eq, and, sql, like, gte, lte, desc, asc, or, isNull } from 'drizzle-orm';
import type { ItemStatus } from '@/lib/constants';
import { canViewAllData } from '@/lib/auth-utils';
import { escapeLike, likeContains, parsePagination, parseSortParams, type PaginationParams, type SortParams } from '@/lib/api-utils';
import { dateParamToTimestamp } from '@/lib/utils';
import type { Session } from 'next-auth';

export interface InventoryFilter {
  status?: ItemStatus;
  category?: string;
  search?: string;
  startDate?: number | null;
  endDate?: number | null;
}

export interface InventoryListResult {
  rows: Array<typeof items.$inferSelect & { photos: typeof photos.$inferSelect[]; sales: typeof sales.$inferSelect[] }>;
  total: number;
  categories: string[];
}

const SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'purchaseDate', 'purchasePrice', 'status'] as const;
type SortField = (typeof SORT_FIELDS)[number];

export function buildInventoryWhere(session: Session, filter: InventoryFilter) {
  const conditions = [];
  if (!canViewAllData(session)) {
    conditions.push(eq(items.ownerId, Number(session.user.id)));
  }
  if (filter.status) {
    conditions.push(eq(items.status, filter.status));
  }
  if (filter.category) {
    conditions.push(eq(items.category, filter.category));
  }
  if (filter.search) {
    const term = likeContains(filter.search);
    conditions.push(
      or(
        like(items.name, term),
        like(items.description, term),
        like(items.purchaseLocation, term),
      )!,
    );
  }
  if (filter.startDate !== null && filter.startDate !== undefined) {
    conditions.push(gte(items.purchaseDate, filter.startDate));
  }
  if (filter.endDate !== null && filter.endDate !== undefined) {
    conditions.push(lte(items.purchaseDate, filter.endDate));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export function sortColumn(field: SortField) {
  switch (field) {
    case 'name': return items.name;
    case 'purchaseDate': return items.purchaseDate;
    case 'purchasePrice': return items.purchasePrice;
    case 'status': return items.status;
    case 'updatedAt': return items.updatedAt;
    case 'createdAt':
    default: return items.createdAt;
  }
}

export async function listInventory(
  session: Session,
  pagination: PaginationParams,
  sort: SortParams,
  filter: InventoryFilter,
): Promise<InventoryListResult> {
  const where = buildInventoryWhere(session, filter);
  const orderBy = sort.sortOrder === 'asc'
    ? asc(sortColumn(sort.sortBy as SortField))
    : desc(sortColumn(sort.sortBy as SortField));

  const rows = await db.query.items.findMany({
    where,
    with: { photos: true, sales: true },
    orderBy,
    offset: pagination.offset,
    limit: pagination.limit,
  });

  const total = where
    ? await db.$count(items, where)
    : await db.$count(items);

  // Distinct categories (respecting RBAC)
  const categoryRows = db
    .select({ category: items.category })
    .from(items)
    .where(where ?? sql`1=1`)
    .all();
  const categories = Array.from(
    new Set(categoryRows.map((r) => r.category).filter((c): c is string => Boolean(c))),
  ).sort();

  return { rows, total, categories };
}

export function parseInventoryFilters(searchParams: URLSearchParams): InventoryFilter {
  const status = (searchParams.get('status') as ItemStatus | null) ?? undefined;
  const category = searchParams.get('category') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const startDate = dateParamToTimestamp(searchParams.get('startDate'));
  const endDate = dateParamToTimestamp(searchParams.get('endDate'));
  return { status, category, search, startDate, endDate };
}