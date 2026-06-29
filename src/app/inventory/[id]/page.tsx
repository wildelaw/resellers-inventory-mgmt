import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import AppShell from '@/components/app-shell';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { canViewAllData, canEditOthersData, currentUserId } from '@/lib/auth-utils';
import { STATUS_LABELS, STATUS_BADGE_CLASSES } from '@/lib/constants';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';
import ItemActions from './ItemActions';

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = parseInt(id, 10);
  const session = await auth();
  if (!session?.user) return null;

  const item = db.query.items.findFirst({
    where: eq(items.id, itemId), with: { photos: true, sales: true },
  }).sync();
  if (!item) notFound();

  const uid = currentUserId(session);
  const canEdit = item.ownerId === uid || canEditOthersData(session);
  const canView = item.ownerId === uid || canViewAllData(session);
  if (!canView) notFound();

  return (
    <AppShell>
      <div className="mb-4">
        <Link href="/inventory" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Back to inventory</Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{item.name}</h1>
              <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${STATUS_BADGE_CLASSES[item.status as keyof typeof STATUS_BADGE_CLASSES]}`}>
                {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS]}
              </span>
            </div>
            {canEdit && (
              <Link href={`/inventory/${item.id}/edit`} className="text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 px-3 py-1.5 rounded-md">Edit</Link>
            )}
          </div>
          {item.description && <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>}
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-gray-500">Purchased</dt><dd>{formatDate(item.purchaseDate)}</dd></div>
            <div><dt className="text-gray-500">Purchase price</dt><dd>{formatCurrency(item.purchasePrice)}</dd></div>
            <div><dt className="text-gray-500">Location</dt><dd>{item.purchaseLocation || '—'}</dd></div>
            <div><dt className="text-gray-500">Category</dt><dd>{item.category || '—'}</dd></div>
            <div><dt className="text-gray-500">Removed</dt><dd>{item.removalDate ? formatDate(item.removalDate) : '—'}</dd></div>
            <div><dt className="text-gray-500">Notes</dt><dd>{item.notes || '—'}</dd></div>
          </dl>
          {canEdit && (
            <ItemActions itemId={item.id} currentStatus={item.status as never} />
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="font-semibold mb-3">Photos</h2>
          <div className="grid grid-cols-2 gap-2">
            {item.photos.length === 0 && <p className="text-sm text-gray-500 col-span-2">No photos.</p>}
            {item.photos.map((p) => (
              <img key={p.id} src={getPhotoUrl(item.id, p.filename)} alt="" className="w-full h-24 object-cover rounded" />
            ))}
          </div>
          <h2 className="font-semibold mt-6 mb-2">Sales ({item.sales.length})</h2>
          <ul className="text-sm space-y-1">
            {item.sales.length === 0 && <li className="text-gray-500">No sales recorded.</li>}
            {item.sales.map((s) => (
              <li key={s.id}>
                <Link href={`/sales/${s.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {formatDate(s.soldDate)} — {formatCurrency(s.soldPrice)} ({s.platform})
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}