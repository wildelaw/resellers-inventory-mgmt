import { redirect } from 'next/navigation';
import { and, asc, desc, eq, sql, gte, lte } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { canViewAllData, sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import PageShell from '@/components/page-shell';
import InventoryClient from './InventoryClient';

// Server Component — fetches initial data directly from the database
export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const params = await searchParams;
  const page = Math.max(1, parseInt(String(params.page ?? '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(params.pageSize ?? '20'), 10) || 20));

  const conditions = [];
  if (!canViewAllData(session)) conditions.push(eq(items.ownerId, sessionUserId(session)));

  const [rows, [{ count }], categoryRows] = await Promise.all([
    db.query.items.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: { photos: true, sales: true },
      orderBy: [desc(items.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ count: sql<number>`count(*)` }).from(items)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
    db.selectDistinct({ category: items.category }).from(items)
      .where(canViewAllData(session) ? undefined : eq(items.ownerId, sessionUserId(session))),
  ]);

  const total = Number(count);
  const initialData = {
    items: rows.map((r) => ({
      ...r,
      purchaseDate: r.purchaseDate.toISOString(),
      removalDate: r.removalDate?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    categories: categoryRows.map((c) => c.category).filter((c): c is string => c !== null).sort(),
  };

  return (
    <PageShell>
      <InventoryClient
        initialData={initialData}
        canDeleteOthers={session.user.role === 'admin'}
      />
    </PageShell>
  );
}