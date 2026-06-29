import { and, eq, like, or, desc, asc, sql } from 'drizzle-orm';
import AppShell from '@/components/app-shell';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { canViewAllData, currentUserId } from '@/lib/auth-utils';
import { parsePagination, parseSortParams, likeContains } from '@/lib/api-utils';
import { ALL_STATUSES } from '@/lib/constants';
import type { ItemStatus } from '@/lib/constants';
import InventoryClient, { type InventoryItemView } from './InventoryClient';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const sp = new URLSearchParams();
  const params = await searchParams;
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string') sp.set(k, v);
    else if (Array.isArray(v) && v[0]) sp.set(k, v[0]);
  }

  const { limit, offset, page, pageSize } = parsePagination(sp);
  const { sortBy, sortOrder } = parseSortParams(sp, ['createdAt', 'purchaseDate', 'purchasePrice', 'name', 'status'], 'createdAt');
  const uid = currentUserId(session);
  const viewAll = canViewAllData(session);

  const status = sp.get('status') ?? undefined;
  const category = sp.get('category') ?? undefined;
  const search = sp.get('search') ?? undefined;

  const conditions = [];
  if (!viewAll) conditions.push(eq(items.ownerId, uid));
  if (status && ALL_STATUSES.includes(status as ItemStatus)) conditions.push(eq(items.status, status as ItemStatus));
  if (category) conditions.push(eq(items.category, category));
  if (search) {
    const term = likeContains(search);
    conditions.push(or(like(items.name, term), like(items.purchaseLocation, term)) ?? eq(items.id, 0));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const sortCol = sortBy === 'purchasePrice' ? items.purchasePrice : sortBy === 'purchaseDate' ? items.purchaseDate : sortBy === 'name' ? items.name : sortBy === 'status' ? items.status : items.createdAt;
  const orderFn = sortOrder === 'asc' ? asc : desc;

  const total = db.select({ c: sql<number>`COUNT(*)` }).from(items).where(where).get()?.c ?? 0;
  const rows = db.query.items.findMany({
    where, with: { photos: true }, orderBy: [orderFn(sortCol)], limit, offset,
  }).sync();

  const categories = Array.from(new Set(
    db.select({ c: items.category }).from(items).where(viewAll ? undefined : eq(items.ownerId, uid)).all()
      .map((r) => r.c).filter((c): c is string => Boolean(c))
  )).sort();

  return (
    <AppShell>
      <InventoryClient
        initialItems={rows as InventoryItemView[]}
        initialPagination={{ page, pageSize, total, totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0 }}
        categories={categories}
        statuses={ALL_STATUSES}
        canEditOthers={session.user.role === 'admin'}
      />
    </AppShell>
  );
}