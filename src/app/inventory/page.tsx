import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { eq, and, sql, desc, like } from 'drizzle-orm';
import { canViewAllData } from '@/lib/auth-utils';
import { STATUS_LABELS, STATUS_COLORS, ALL_STATUSES } from '@/lib/constants';
import type { ItemStatus } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import Header from '@/components/header';
import InventoryClient from './InventoryClient';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const params = await searchParams;
  const viewAll = canViewAllData(session);
  const userId = Number(session.user.id);

  // Parse filter params
  const status = typeof params.status === 'string' ? params.status as ItemStatus : undefined;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  // Build conditions
  const conditions = [];
  if (!viewAll) {
    conditions.push(eq(items.ownerId, userId));
  }
  if (status) {
    conditions.push(eq(items.status, status));
  }
  if (search) {
    conditions.push(like(items.name, `%${search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Fetch items and count
  const [itemsList, countResult] = await Promise.all([
    db.select().from(items).where(whereClause).orderBy(desc(items.createdAt)).limit(pageSize).offset(offset).all(),
    db.select({ count: sql<number>`count(*)` }).from(items).where(whereClause).get(),
  ]);

  const total = countResult?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Get categories for filter
  const categories = await db.selectDistinct({ category: items.category }).from(items).where(
    viewAll ? undefined : eq(items.ownerId, userId)
  ).all();

  return (
    <>
      <Header />
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <InventoryClient
          initialItems={itemsList}
          pagination={{ page, pageSize, total, totalPages }}
          statusFilter={status}
          searchFilter={search}
          categories={categories.map((c) => c.category).filter(Boolean) as string[]}
          allStatuses={ALL_STATUSES}
          statusLabels={STATUS_LABELS}
          statusColors={STATUS_COLORS}
        />
      </Suspense>
    </>
  );
}