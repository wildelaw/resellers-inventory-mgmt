import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import { db } from '@/lib/db';
import { sales } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PLATFORM_LABELS } from '@/lib/constants';
import SaleDetailClient from './SaleDetailClient';

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, parseInt(id)),
    with: { item: true, seller: true },
  });
  if (!sale) redirect('/sales');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SaleDetailClient sale={sale as any} />
      </main>
    </div>
  );
}