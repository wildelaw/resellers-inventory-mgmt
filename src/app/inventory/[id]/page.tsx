import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { formatCurrency, formatDate } from '@/lib/utils';
import { STATUS_LABELS, STATUS_COLORS, getAllowedTransitions } from '@/lib/constants';
import type { ItemStatus } from '@/lib/constants';
import ItemDetailClient from './ItemDetailClient';

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const item = await db.query.items.findFirst({
    where: eq(items.id, parseInt(id)),
    with: { photos: true, sales: true },
  });
  if (!item) redirect('/inventory');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ItemDetailClient item={item as any} />
      </main>
    </div>
  );
}