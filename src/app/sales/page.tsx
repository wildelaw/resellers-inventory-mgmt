import { redirect } from 'next/navigation';
import { desc, eq, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { canViewAllData, sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { sales } from '@/lib/schema';
import SalesClient, { type SalesListSale } from './SalesClient';

// Server Component — initial page of sales fetched directly from the database
export default async function SalesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const where = canViewAllData(session) ? undefined : eq(sales.soldBy, sessionUserId(session));

  const [rows, [{ count }]] = await Promise.all([
    db.query.sales.findMany({
      where,
      with: { item: true },
      orderBy: [desc(sales.soldDate)],
      limit: 20,
    }),
    db.select({ count: sql<number>`count(*)` }).from(sales).where(where),
  ]);

  const total = Number(count);
  const initialSales = rows.map((r) => ({
    ...r,
    soldDate: r.soldDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
  })) as unknown as SalesListSale[];

  return (
    <SalesClient
      initialSales={initialSales}
      initialPagination={{ page: 1, pageSize: 20, total, totalPages: Math.max(1, Math.ceil(total / 20)) }}
    />
  );
}