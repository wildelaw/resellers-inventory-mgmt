import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import { db } from '@/lib/db';
import { sales } from '@/lib/schema';
import { canViewAllData } from '@/lib/auth-utils';
import { eq, desc } from 'drizzle-orm';
import SalesClient from './SalesClient';

export default async function SalesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = parseInt(session.user.id);
  const whereCondition = canViewAllData(session) ? undefined : eq(sales.soldBy, userId);

  const initialSales = await db.query.sales.findMany({
    where: whereCondition,
    with: { item: true },
    orderBy: desc(sales.soldDate),
    limit: 50,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SalesClient initialSales={initialSales as any} />
      </main>
    </div>
  );
}