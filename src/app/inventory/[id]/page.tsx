import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { items, photos, sales } from '@/lib/schema';
import { canAccessResource, sessionUserId } from '@/lib/auth-utils';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';
import { STATUS_LABELS, STATUS_COLORS, getAllowedTransitions, type ItemStatus } from '@/lib/constants';
import { calculateProfit } from '@/lib/financial';
import Header from '@/components/header';
import Link from 'next/link';
import ItemDetailClient from './ItemDetailClient';

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const itemId = Number(id);

  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
    with: { photos: true, sales: true },
  });
  if (!item) redirect('/inventory');
  if (!canAccessResource(item.ownerId, session, 'read')) redirect('/inventory');

  const canEdit = canAccessResource(item.ownerId, session, 'write');
  const allowedTransitions = getAllowedTransitions(item.status as ItemStatus);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/inventory" className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block">← Back to Inventory</Link>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{item.name}</h1>
            <span className={`px-3 py-1 rounded text-sm font-medium ${STATUS_COLORS[item.status as ItemStatus]}`}>{STATUS_LABELS[item.status as ItemStatus]}</span>
          </div>
          {item.description && <p className="text-gray-600 dark:text-gray-300 mb-4">{item.description}</p>}
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div><span className="text-gray-500">Purchase Price:</span> {formatCurrency(item.purchasePrice)}</div>
            <div><span className="text-gray-500">Purchase Date:</span> {formatDate(item.purchaseDate)}</div>
            <div><span className="text-gray-500">Location:</span> {item.purchaseLocation || '—'}</div>
            <div><span className="text-gray-500">Category:</span> {item.category || '—'}</div>
            {item.removalDate && <div><span className="text-gray-500">Removal Date:</span> {formatDate(item.removalDate)}</div>}
          </div>
          {item.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {item.photos.map((p) => (
                <img key={p.id} src={getPhotoUrl(item.id, p.filename)} alt={item.name} className="w-full h-32 object-cover rounded-md" />
              ))}
            </div>
          )}
          {canEdit && (
            <ItemDetailClient itemId={item.id} currentStatus={item.status as ItemStatus} allowedTransitions={allowedTransitions} />
          )}
          {canEdit && (
            <div className="mt-4">
              <Link href={`/inventory/${item.id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">Edit Item</Link>
            </div>
          )}
          {item.sales.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Sales History</h2>
              {item.sales.map((s) => (
                <div key={s.id} className="border-t border-gray-200 dark:border-gray-700 py-3 text-sm">
                  <Link href={`/sales/${s.id}`} className="text-blue-600 hover:text-blue-700">Sale #{s.id}</Link> — {formatCurrency(s.soldPrice)} on {formatDate(s.soldDate)}
                  {s.refundAmount > 0 && <span className="text-red-600 ml-2">(Refunded: {formatCurrency(s.refundAmount)})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
