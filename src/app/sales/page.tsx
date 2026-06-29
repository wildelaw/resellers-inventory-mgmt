import { and, eq, gte, lte, desc, asc, sql } from 'drizzle-orm';
import AppShell from '@/components/app-shell';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sales } from '@/lib/schema';
import { canViewAllData, currentUserId } from '@/lib/auth-utils';
import { parsePagination, parseSortParams } from '@/lib/api-utils';
import { PLATFORMS } from '@/lib/constants';
import type { Platform } from '@/lib/constants';
import SalesClient, { type SaleView } from './SalesClient';

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const sp = new URLSearchParams();
  const params = await searchParams;
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string') sp.set(k, v); else if (Array.isArray(v) && v[0]) sp.set(k, v[0]);
  }
  const { limit, offset, page, pageSize } = parsePagination(sp);
  const { sortBy, sortOrder } = parseSortParams(sp, ['soldDate', 'soldPrice'], 'soldDate');
  const uid = currentUserId(session);
  const viewAll = canViewAllData(session);

  const conditions = [];
  if (!viewAll) conditions.push(eq(sales.soldBy, uid));
  const platform = sp.get('platform');
  if (platform && PLATFORMS.includes(platform as Platform)) conditions.push(eq(sales.platform, platform as Platform));
  const startTs = sp.get('startDate') ? new Date(sp.get('startDate') as string).getTime() / 1000 : null;
  const endTs = sp.get('endDate') ? new Date(sp.get('endDate') as string).getTime() / 1000 : null;
  if (startTs) conditions.push(gte(sales.soldDate, Math.floor(startTs)));
  if (endTs) conditions.push(lte(sales.soldDate, Math.floor(endTs)));
  const where = conditions.length ? and(...conditions) : undefined;

  const orderFn = sortOrder === 'asc' ? asc : desc;
  const sortCol = sortBy === 'soldPrice' ? sales.soldPrice : sales.soldDate;
  const total = db.select({ c: sql<number>`COUNT(*)` }).from(sales).where(where).get()?.c ?? 0;
  const rows = db.query.sales.findMany({ where, with: { item: true }, orderBy: [orderFn(sortCol)], limit, offset }).sync();

  return (
    <AppShell>
      <SalesClient
        initialSales={rows as SaleView[]}
        initialPagination={{ page, pageSize, total, totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0 }}
        platforms={PLATFORMS}
      />
    </AppShell>
  );
}