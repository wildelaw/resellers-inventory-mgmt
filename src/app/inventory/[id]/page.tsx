import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { canViewAllData } from '@/lib/auth-utils';
import Header from '@/components/header';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';
import { STATUS_LABELS, STATUS_COLORS, getAllowedTransitions, type ItemStatus } from '@/lib/constants';
import Link from 'next/link';
import ItemActions from './ItemActions';

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) redirect('/inventory');

  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
    with: { photos: true, sales: true },
  });

  if (!item) redirect('/inventory');

  if (item.ownerId !== parseInt(session.user.id, 10) && !canViewAllData(session)) {
    redirect('/inventory');
  }

  const canEdit = item.ownerId === parseInt(session.user.id, 10) || session.user.role === 'admin';
  const allowedTransitions = getAllowedTransitions(item.status as ItemStatus);

  return (
    <div>
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/inventory" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Inventory</Link>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {item.photos?.[0] ? (
              <img src={getPhotoUrl(item.id, item.photos[0].filename)} alt={item.name} className="w-full rounded-lg" />
            ) : (
              <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">No photo</div>
            )}
          </div>
          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold">{item.name}</h1>
              <span className={`status-badge ${STATUS_COLORS[item.status as ItemStatus]}`}>{STATUS_LABELS[item.status as ItemStatus]}</span>
            </div>
            {item.description && <p className="text-gray-600 dark:text-gray-300 mb-4">{item.description}</p>}
            <dl className="space-y-2">
              <div className="flex justify-between"><dt className="text-gray-500">Purchase Price:</dt><dd>{formatCurrency(item.purchasePrice)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Purchase Date:</dt><dd>{formatDate(item.purchaseDate)}</dd></div>
              {item.purchaseLocation && <div className="flex justify-between"><dt className="text-gray-500">Location:</dt><dd>{item.purchaseLocation}</dd></div>}
              {item.category && <div className="flex justify-between"><dt className="text-gray-500">Category:</dt><dd>{item.category}</dd></div>}
              {item.notes && <div><dt className="text-gray-500">Notes:</dt><dd className="mt-1">{item.notes}</dd></div>}
            </dl>
            {canEdit && (
              <div className="mt-6 flex gap-2">
                <Link href={`/inventory/${item.id}/edit`} className="btn-secondary">Edit</Link>
                <ItemActions itemId={item.id} currentStatus={item.status as ItemStatus} allowedTransitions={allowedTransitions} canEdit={canEdit} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}