import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { canViewAllData } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';
import InventoryClient from './InventoryClient';

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const viewAll = canViewAllData(session);

  const where = viewAll ? undefined : eq(items.ownerId, parseInt(session.user.id));

  const [allItems, categoriesRaw] = await Promise.all([
    db.query.items.findMany({
      where,
      with: {
        photos: true,
        sales: true,
        owner: { columns: { id: true, name: true, email: true } },
      },
      orderBy: (items, { desc }) => [desc(items.createdAt)],
      limit: 20,
    }),
    db.query.items.findMany({
      where,
      columns: { category: true },
    }),
  ]);

  const categories = [...new Set(categoriesRaw.map(r => r.category).filter((c): c is string => !!c))];

  return (
    <InventoryClient
      initialItems={allItems as any}
      initialPagination={{ page: 1, pageSize: 20, total: allItems.length, totalPages: 1 }}
      initialCategories={categories}
      canViewAll={viewAll}
    />
  );
}
