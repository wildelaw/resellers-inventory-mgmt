import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { canViewAllData } from '@/lib/auth-utils';
import Header from '@/components/header';
import InventoryClient from './InventoryClient';
import Link from 'next/link';

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const params = await searchParams;
  const page = parseInt((params.page as string) || '1', 10);
  const pageSize = parseInt((params.pageSize as string) || '20', 10);
  const status = params.status as string | undefined;
  const category = params.category as string | undefined;

  const viewAll = canViewAllData(session);
  const userId = parseInt(session.user.id, 10);

  const conditions = [];
  if (!viewAll) conditions.push(eq(items.ownerId, userId));
  if (status) conditions.push(eq(items.status, status));
  if (category) conditions.push(eq(items.category, category));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const [data, categories] = await Promise.all([
    db.query.items.findMany({
      where,
      with: { photos: true },
      limit: pageSize,
      offset,
    }),
    db.select({ category: items.category }).from(items).where(where ?? undefined).groupBy(items.category),
  ]);

  return (
    <div>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Inventory</h1>
          <Link href="/inventory/new" className="btn-primary">Add Item</Link>
        </div>
        <InventoryClient
          initialItems={data as never}
          initialPagination={{ page, pageSize, total: data.length, totalPages: 1 }}
          categories={categories.map((c) => c.category).filter(Boolean) as string[]}
        />
      </main>
    </div>
  );
}