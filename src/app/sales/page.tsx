import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { sales } from '@/lib/schema';
import { canViewAllData, sessionUserId } from '@/lib/auth-utils';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PLATFORM_LABELS } from '@/lib/constants';
import Header from '@/components/header';
import SalesClient from './SalesClient';

export default async function SalesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const uid = sessionUserId(session);
  const viewAll = canViewAllData(session);
  const where = viewAll ? undefined : eq(sales.soldBy, uid);

  const initialSales = await db.query.sales.findMany({
    where,
    with: { item: true },
    orderBy: [desc(sales.soldDate)],
    limit: 20,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SalesClient initialSales={initialSales} canViewAll={viewAll} />
      </main>
    </div>
  );
}
