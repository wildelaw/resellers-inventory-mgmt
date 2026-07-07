import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { canViewAllData, sessionUserId } from '@/lib/auth-utils';
import Header from '@/components/header';
import InventoryClient from './InventoryClient';

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const uid = sessionUserId(session);
  const viewAll = canViewAllData(session);
  const where = viewAll ? undefined : eq(items.ownerId, uid);

  const initialItems = await db.query.items.findMany({
    where,
    with: { photos: true },
    orderBy: (items, { desc }) => [desc(items.createdAt)],
    limit: 20,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <InventoryClient initialItems={initialItems} canViewAll={viewAll} />
      </main>
    </div>
  );
}
