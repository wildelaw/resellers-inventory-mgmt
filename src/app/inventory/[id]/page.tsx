import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { canAccessResource } from '@/lib/auth-utils';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';
import { STATUS_LABELS, STATUS_COLORS, getAllowedTransitions, STATUS_LABELS as SLabels } from '@/lib/constants';
import Header from '@/components/header';
import ItemDetailClient from './ItemDetailClient';

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id } = await params;
  const itemId = Number(id);

  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
    with: {
      photos: true,
      sales: {
        with: { seller: true },
      },
      owner: true,
    },
  });

  if (!item) redirect('/inventory');

  if (!canAccessResource(item.ownerId, session, 'read')) {
    redirect('/inventory');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ItemDetailClient item={item as any} canEdit={canAccessResource(item.ownerId, session, 'write')} />
      </main>
    </div>
  );
}