import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sales } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { canViewAllData } from '@/lib/auth-utils';
import Header from '@/components/header';
import SalesClient from './SalesClient';
import Link from 'next/link';

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const params = await searchParams;
  const page = parseInt((params.page as string) || '1', 10);
  const pageSize = parseInt((params.pageSize as string) || '20', 10);

  const viewAll = canViewAllData(session);
  const userId = parseInt(session.user.id, 10);

  const where = viewAll ? undefined : eq(sales.soldBy, userId);
  const offset = (page - 1) * pageSize;

  const data = await db.query.sales.findMany({
    where,
    with: { item: true, seller: true },
    orderBy: [desc(sales.soldDate)],
    limit: pageSize,
    offset,
  });

  return (
    <div>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Sales</h1>
          <Link href="/sales/new" className="btn-primary">Record Sale</Link>
        </div>
        <SalesClient initialSales={data as never} />
      </main>
    </div>
  );
}