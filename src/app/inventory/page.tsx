import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { canViewAllData } from '@/lib/auth-utils';
import Header from '@/components/header';
import InventoryClient from './InventoryClient';

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const viewAll = canViewAllData(session);
  const where = viewAll ? undefined : eq(items.ownerId, Number(session.user.id));

  const initialItems = await db.query.items.findMany({
    where,
    with: { photos: true },
    orderBy: [desc(items.createdAt)],
    limit: 20,
  });

  const totalCount = await db.select({ count: sql<number>`count(*)` })
    .from(items)
    .where(where);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <InventoryClient
          initialItems={initialItems as any}
          initialTotal={totalCount[0]?.count ?? 0}
          canViewAll={viewAll}
        />
      </main>
    </div>
  );
}