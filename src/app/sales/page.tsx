import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sales } from '@/lib/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { canViewAllData } from '@/lib/auth-utils';
import Header from '@/components/header';
import SalesClient from './SalesClient';

export default async function SalesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const viewAll = canViewAllData(session);
  const where = viewAll ? undefined : eq(sales.soldBy, Number(session.user.id));

  const initialSales = await db.query.sales.findMany({
    where,
    with: { item: true, seller: true },
    orderBy: [desc(sales.soldDate)],
    limit: 20,
  });

  const totalCount = await db.select({ count: sql<number>`count(*)` })
    .from(sales)
    .where(where);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SalesClient initialSales={initialSales as any} initialTotal={totalCount[0]?.count ?? 0} canViewAll={viewAll} />
      </main>
    </div>
  );
}