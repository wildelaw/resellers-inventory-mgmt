import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { canAccessResource } from '@/lib/auth-utils';
import Header from '@/components/header';
import { PLATFORM_LABELS } from '@/lib/constants';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';
import SaleDetailActions from './SaleDetailActions';

export const dynamic = 'force-dynamic';

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, id),
    with: { item: { with: { photos: true } }, seller: true },
  });
  if (!sale) notFound();
  if (!canAccessResource(sale.soldBy, session.user.id, session, 'read')) {
    notFound();
  }

  const purchasePrice = sale.item?.purchasePrice ?? 0;
  const profit = calculateProfit({
    soldPrice: sale.soldPrice,
    shippingCollected: sale.shippingCollected,
    salesTax: sale.salesTax,
    platformFees: sale.platformFees,
    refundAmount: sale.refundAmount,
    shippingCost: sale.shippingCost,
    purchasePrice,
  });

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <a href="/sales" className="text-sm text-blue-600 hover:underline">← Back to sales</a>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">Sale #{sale.id}</h1>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formatDate(sale.soldDate)} on {PLATFORM_LABELS[sale.platform as keyof typeof PLATFORM_LABELS] ?? sale.platform}
              </div>
            </div>
            <SaleDetailActions
              saleId={sale.id}
              refundType={sale.refundType as any}
              canEdit={canAccessResource(sale.soldBy, session.user.id, session, 'write')}
            />
          </div>

          {sale.item && (
            <div className="mt-6 p-4 rounded bg-gray-50 dark:bg-gray-900 flex items-center gap-4">
              {sale.item.photos.find((p) => p.isPrimary) && (
                <img
                  src={getPhotoUrl(sale.item.id, sale.item.photos.find((p) => p.isPrimary)!.filename)}
                  alt={sale.item.name}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div>
                <a href={`/inventory/${sale.item.id}`} className="font-medium hover:text-blue-600">
                  {sale.item.name}
                </a>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Purchased {formatCurrency(sale.item.purchasePrice)} on {formatDate(sale.item.purchaseDate)}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Sold price</div>
              <div className="font-medium">{formatCurrency(sale.soldPrice)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Shipping collected</div>
              <div className="font-medium">{formatCurrency(sale.shippingCollected)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Shipping cost</div>
              <div className="font-medium">{formatCurrency(sale.shippingCost)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Sales tax</div>
              <div className="font-medium">{formatCurrency(sale.salesTax)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Platform fees</div>
              <div className="font-medium">{formatCurrency(sale.platformFees)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Refund</div>
              <div className="font-medium">
                {sale.refundAmount && sale.refundAmount > 0 ? formatCurrency(sale.refundAmount) : '—'}
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded bg-blue-50 dark:bg-blue-900">
            <div className="text-sm text-blue-700 dark:text-blue-100">Net profit</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-50">{formatCurrency(profit)}</div>
          </div>

          {sale.refundReason && (
            <div className="mt-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">Refund reason</div>
              <div className="mt-1">{sale.refundReason}</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}