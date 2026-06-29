import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, photos, sales } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import Header from '@/components/header';
import { canAccessResource } from '@/lib/auth-utils';
import { STATUS_LABELS, STATUS_COLORS, PLATFORM_LABELS } from '@/lib/constants';
import { formatCurrency, formatDate, formatDateTime, getPhotoUrl } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';
import Link from 'next/link';
import ItemActions from './ItemActions';

export const dynamic = 'force-dynamic';

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const item = await db.query.items.findFirst({
    where: eq(items.id, id),
    with: { photos: true, sales: true, owner: true },
  });
  if (!item) notFound();
  if (!canAccessResource(item.ownerId, session.user.id, session, 'read')) {
    notFound();
  }

  const totalProfit = item.sales.reduce((s, sale) => {
    return s + calculateProfit({
      soldPrice: sale.soldPrice,
      shippingCollected: sale.shippingCollected,
      salesTax: sale.salesTax,
      platformFees: sale.platformFees,
      refundAmount: sale.refundAmount,
      shippingCost: sale.shippingCost,
      purchasePrice: item.purchasePrice,
    });
  }, 0);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <Link href="/inventory" className="text-sm text-blue-600 hover:underline">← Back to inventory</Link>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">{item.name}</h1>
              <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[item.status as keyof typeof STATUS_COLORS]}`}>
                {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS]}
              </span>
            </div>
            <ItemActions itemId={item.id} status={item.status as any} canEdit={canAccessResource(item.ownerId, session.user.id, session, 'write')} />
          </div>
          {item.description && <p className="mt-4 text-gray-600 dark:text-gray-300">{item.description}</p>}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Purchased</div>
              <div className="font-medium">{formatDate(item.purchaseDate)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Price</div>
              <div className="font-medium">{formatCurrency(item.purchasePrice)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Location</div>
              <div className="font-medium">{item.purchaseLocation ?? '—'}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Category</div>
              <div className="font-medium">{item.category ?? '—'}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Removed</div>
              <div className="font-medium">{item.removalDate ? formatDateTime(item.removalDate) : '—'}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Owner</div>
              <div className="font-medium">{item.owner?.name ?? '—'}</div>
            </div>
          </div>
          {item.notes && (
            <div className="mt-6">
              <div className="text-gray-500 dark:text-gray-400 text-sm">Notes</div>
              <div className="mt-1 whitespace-pre-wrap">{item.notes}</div>
            </div>
          )}
        </div>

        {item.photos.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Photos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {item.photos.map((p) => (
                <img
                  key={p.id}
                  src={getPhotoUrl(item.id, p.filename)}
                  alt={item.name}
                  className="w-full h-32 object-cover rounded"
                />
              ))}
            </div>
          </div>
        )}

        {item.sales.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Sales history</h2>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sold price</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Refund</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {item.sales.map((sale) => {
                  const profit = calculateProfit({
                    soldPrice: sale.soldPrice,
                    shippingCollected: sale.shippingCollected,
                    salesTax: sale.salesTax,
                    platformFees: sale.platformFees,
                    refundAmount: sale.refundAmount,
                    shippingCost: sale.shippingCost,
                    purchasePrice: item.purchasePrice,
                  });
                  return (
                    <tr key={sale.id}>
                      <td className="px-3 py-2 text-sm">{formatDate(sale.soldDate)}</td>
                      <td className="px-3 py-2 text-sm">{PLATFORM_LABELS[sale.platform as keyof typeof PLATFORM_LABELS] ?? sale.platform}</td>
                      <td className="px-3 py-2 text-sm">{formatCurrency(sale.soldPrice)}</td>
                      <td className="px-3 py-2 text-sm">{sale.refundAmount ? formatCurrency(sale.refundAmount) : '—'}</td>
                      <td className="px-3 py-2 text-sm font-medium">{formatCurrency(profit)}</td>
                      <td className="px-3 py-2 text-right">
                        <Link href={`/sales/${sale.id}`} className="text-blue-600 hover:underline text-sm">View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Total profit from this item: <strong className="text-gray-900 dark:text-white">{formatCurrency(totalProfit)}</strong>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}