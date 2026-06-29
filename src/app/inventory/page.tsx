import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { listInventory, parseInventoryFilters } from '@/lib/inventory-queries';
import { parsePagination, parseSortParams } from '@/lib/api-utils';
import Header from '@/components/header';
import InventoryClient from './InventoryClient';
import type { ItemStatus } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const sp = new URLSearchParams();
  const params = await searchParams;
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else if (v !== undefined) sp.set(k, v);
  }

  const pagination = parsePagination(sp);
  const sort = parseSortParams(sp, ['createdAt', 'updatedAt', 'name', 'purchaseDate', 'purchasePrice', 'status'], 'createdAt');
  const filter = parseInventoryFilters(sp);
  const { rows, total, categories } = await listInventory(session, pagination, sort, filter);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Inventory</h1>
        <InventoryClient
          initialItems={rows as never}
          initialCategories={categories}
          initialTotal={total}
          initialPage={pagination.page}
          initialPageSize={pagination.pageSize}
          initialStatus={filter.status ?? ''}
          initialCategory={filter.category ?? ''}
          initialSearch={filter.search ?? ''}
        />
      </main>
    </div>
  );
}