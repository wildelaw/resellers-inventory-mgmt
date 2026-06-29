import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listSales, parseSaleFilters } from '@/lib/sales-queries';
import { parsePagination, parseSortParams } from '@/lib/api-utils';
import Header from '@/components/header';
import SalesClient from './SalesClient';

export const dynamic = 'force-dynamic';

export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const sp = new URLSearchParams();
  const params = await searchParams;
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else if (v !== undefined) sp.set(k, v);
  }

  const pagination = parsePagination(sp);
  const sort = parseSortParams(sp, ['soldDate', 'soldPrice', 'platform', 'createdAt'], 'soldDate');
  const filter = parseSaleFilters(sp);
  const { rows, total } = await listSales(session, pagination, sort, filter);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Sales</h1>
        <SalesClient
          initialSales={rows as never}
          initialTotal={total}
          initialPage={pagination.page}
          initialPageSize={pagination.pageSize}
          initialPlatform={filter.platform ?? ''}
          initialSearch={filter.search ?? ''}
        />
      </main>
    </div>
  );
}