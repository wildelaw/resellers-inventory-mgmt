import { redirect, notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { canAccessResource, canViewAllData, sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { sales } from '@/lib/schema';
import { calculateProfit, calculateNetRevenue } from '@/lib/financial';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageShell from '@/components/page-shell';
import SaleDetailActions from './SaleDetailActions';

// Server Component — sale detail with profit breakdown and refund actions
export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id } = await params;
  const saleId = Number(id);
  if (!Number.isInteger(saleId)) notFound();

  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
    with: { item: true },
  });
  if (!sale) notFound();

  const userId = sessionUserId(session);
  if (!canAccessResource(sale.soldBy, userId, session, 'read')) notFound();

  const canRefund = sale.soldBy === userId || canViewAllData(session);

  const netRevenue = calculateNetRevenue({
    soldPrice: sale.soldPrice,
    shippingCollected: sale.shippingCollected,
    salesTax: sale.salesTax,
    platformFees: sale.platformFees,
    refundAmount: sale.refundAmount,
  });

  const profit = sale.item
    ? calculateProfit({
        soldPrice: sale.soldPrice,
        shippingCollected: sale.shippingCollected,
        salesTax: sale.salesTax,
        platformFees: sale.platformFees,
        refundAmount: sale.refundAmount,
        purchasePrice: sale.item.purchasePrice,
        shippingCost: sale.shippingCost,
      })
    : null;

  const rows: { label: string; value: string; cls?: string }[] = [
    { label: 'Sold Date', value: formatDate(sale.soldDate) },
    { label: 'Platform', value: sale.platform },
    { label: 'Sold Price', value: formatCurrency(sale.soldPrice) },
    { label: 'Shipping Collected', value: sale.shippingCollected ? formatCurrency(sale.shippingCollected) : '—' },
    { label: 'Sales Tax', value: sale.salesTax ? formatCurrency(sale.salesTax) : '—' },
    { label: 'Platform Fees', value: sale.platformFees ? formatCurrency(sale.platformFees) : '—' },
    { label: 'Shipping Cost', value: sale.shippingCost ? formatCurrency(sale.shippingCost) : '—' },
    { label: 'Refund', value: sale.refundAmount ? formatCurrency(sale.refundAmount) : '—' },
    ...(sale.refundReason ? [{ label: 'Refund Reason', value: sale.refundReason }] : []),
    { label: 'Net Revenue', value: formatCurrency(netRevenue) },
    ...(profit !== null
      ? [{ label: 'Profit', value: formatCurrency(profit), cls: profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' }]
      : []),
  ];

  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Sale #{sale.id}</h1>
      {sale.item && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Item: <a href={`/inventory/${sale.item.id}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">{sale.item.name}</a>
        </p>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-4 max-w-2xl">
        <dl className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4">
              <dt className="text-sm text-gray-500 dark:text-gray-400">{row.label}</dt>
              <dd className={`text-sm font-medium text-gray-900 dark:text-white ${row.cls ?? ''}`}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {canRefund && (
        <SaleDetailActions
          saleId={sale.id}
          soldPrice={sale.soldPrice}
          refundAmount={sale.refundAmount ?? 0}
        />
      )}
    </PageShell>
  );
}