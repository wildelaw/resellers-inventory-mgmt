import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { canViewAllData } from '@/lib/auth-utils';
import { eq, desc } from 'drizzle-orm';
import InventoryClient from './InventoryClient';

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = parseInt(session.user.id);
  const whereCondition = canViewAllData(session) ? undefined : eq(items.ownerId, userId);

  const initialItems = await db.query.items.findMany({
    where: whereCondition,
    with: { photos: true },
    orderBy: desc(items.createdAt),
    limit: 50,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <InventoryClient initialItems={initialItems} />
      </main>
    </div>
  );
}