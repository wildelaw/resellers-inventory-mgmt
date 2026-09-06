import { redirect, notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { canEditOthersData, canViewAllData, sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { formatCurrency, formatDate } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import PageShell from '@/components/page-shell';
import ItemActions from './ItemActions';

// Server Component — fetches the item directly from the database
export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) notFound();

  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
    with: { photos: true, sales: true },
  });
  if (!item) notFound();

  const userId = sessionUserId(session);
  const isOwner = item.ownerId === userId;
  const canEdit = isOwner || canEditOthersData(session);
  const canDelete = canEdit;
  if (!isOwner && !canViewAllData(session)) notFound(); // hide existence from other users

  const profit = item.sales.reduce(
    (sum, sale) => sum + (sale.soldPrice + (sale.shippingCollected ?? 0)) - (sale.salesTax ?? 0) - (sale.platformFees ?? 0) - (sale.refundAmount ?? 0) - item.purchasePrice - (sale.shippingCost ?? 0),
    0
  );

  return (
    <PageShell>
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{item.name}</h1>
          <StatusBadge status={item.status} />
        </div>
        {item.category && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.category}</p>}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Purchase Date</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(item.purchaseDate)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Purchase Price</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(item.purchasePrice)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Purchase Location</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white">{item.purchaseLocation ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Removal Date</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(item.removalDate)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Profit (all sales)</dt>
            <dd className={`text-sm font-medium ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(profit)}
            </dd>
          </div>
        </dl>
        {item.description && (
          <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">{item.description}</p>
        )}
        {item.notes && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{item.notes}</p>
        )}
      </div>

      <ItemActions
        item={{
          id: item.id,
          name: item.name,
          description: item.description,
          purchaseDate: item.purchaseDate.toISOString(),
          purchasePrice: item.purchasePrice,
          purchaseLocation: item.purchaseLocation,
          category: item.category,
          status: item.status,
          notes: item.notes,
          removalDate: item.removalDate?.toISOString() ?? null,
          ownerId: item.ownerId,
          photos: item.photos.map((p) => ({ id: p.id, itemId: p.itemId, filename: p.filename, isPrimary: p.isPrimary })),
          sales: item.sales.map((s) => ({
            id: s.id,
            soldPrice: s.soldPrice,
            soldDate: s.soldDate.toISOString(),
            platform: s.platform,
            refundAmount: s.refundAmount ?? 0,
          })),
        }}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </PageShell>
  );
}