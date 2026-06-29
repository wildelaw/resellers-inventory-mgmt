import { db } from '@/lib/db';
import { sales, items } from '@/lib/schema';
import { eq, and, sql, like, gte, lte, desc, asc, or } from 'drizzle-orm';
import { canViewAllData } from '@/lib/auth-utils';
import { likeContains, parsePagination, parseSortParams, type PaginationParams, type SortParams } from '@/lib/api-utils';
import { dateParamToTimestamp } from '@/lib/utils';
import type { Session } from 'next-auth';

export interface SaleFilter {
  search?: string;
  platform?: string;
  startDate?: number | null;
  endDate?: number | null;
}

const SORT_FIELDS = ['soldDate', 'soldPrice', 'platform', 'createdAt'] as const;
type SortField = (typeof SORT_FIELDS)[number];

export function buildSalesWhere(session: Session, filter: SaleFilter) {
  const conditions = [];
  if (!canViewAllData(session)) {
    conditions.push(eq(sales.soldBy, Number(session.user.id)));
  }
  if (filter.platform) {
    conditions.push(eq(sales.platform, filter.platform as any));
  }
  if (filter.search) {
    const term = likeContains(filter.search);
    conditions.push(
      or(
        like(sales.refundReason, term),
        // join-search by item name via subquery is complex; keep simple
        sql`EXISTS (SELECT 1 FROM items WHERE items.id = ${sales.itemId} AND (items.name LIKE ${term} OR items.description LIKE ${term}))`,
      )!,
    );
  }
  if (filter.startDate !== null && filter.startDate !== undefined) {
    conditions.push(gte(sales.soldDate, filter.startDate));
  }
  if (filter.endDate !== null && filter.endDate !== undefined) {
    conditions.push(lte(sales.soldDate, filter.endDate));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

function sortColumn(field: SortField) {
  switch (field) {
    case 'soldPrice': return sales.soldPrice;
    case 'platform': return sales.platform;
    case 'createdAt': return sales.createdAt;
    case 'soldDate':
    default: return sales.soldDate;
  }
}

export async function listSales(
  session: Session,
  pagination: PaginationParams,
  sort: SortParams,
  filter: SaleFilter,
) {
  const where = buildSalesWhere(session, filter);
  const orderBy = sort.sortOrder === 'asc'
    ? asc(sortColumn(sort.sortBy as SortField))
    : desc(sortColumn(sort.sortBy as SortField));

  const rows = await db.query.sales.findMany({
    where,
    with: { item: true, seller: true },
    orderBy,
    offset: pagination.offset,
    limit: pagination.limit,
  });

  const total = where
    ? await db.$count(sales, where)
    : await db.$count(sales);

  return { rows, total };
}

export function parseSaleFilters(searchParams: URLSearchParams): SaleFilter {
  const platform = searchParams.get('platform') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const startDate = dateParamToTimestamp(searchParams.get('startDate'));
  const endDate = dateParamToTimestamp(searchParams.get('endDate'));
  return { platform, search, startDate, endDate };
}