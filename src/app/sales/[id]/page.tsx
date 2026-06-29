import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import AppShell from '@/components/app-shell';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sales } from '@/lib/schema';
import { canViewAllData, canEditOthersData, currentUserId } from '@/lib/auth-utils';
import { PLATFORM_LABELS, REFUND_TYPE_LABELS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';
import SaleDetailActions from './SaleDetailActions';

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saleId = parseInt(id, 10);
  const session = await auth();
  if (!session?.user) return null;

  const sale = db.query.sales.findFirst({ where: eq(sales.id, saleId), with: { item: true } }).sync();
  if (!sale) notFound();

  const uid = currentUserId(session);
  const canView = sale.soldBy === uid || canViewAllData(session);
  if (!canView) notFound();
  const canEdit = sale.soldBy === uid || canEditOthersData(session);

  const profit = calculateProfit({
    soldPrice: Number(sale.soldPrice), shippingCollected: sale.shippingCollected, salesTax: sale.salesTax,
    platformFees: sale.platformFees, refundAmount: sale.refundAmount,
    purchasePrice: sale.item ? Number(sale.item.purchasePrice) : 0, shippingCost: sale.shippingCost,
  });

  return (
    <AppShell>
      <div className="mb-4">
        <Link href="/sales" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Back to sales</Link>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Sale #{sale.id}</h1>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-gray-500">Date</dt><dd>{formatDate(sale.soldDate)}</dd></div>
          <div><dt className="text-gray-500">Platform</dt><dd>{PLATFORM_LABELS[sale.platform as keyof typeof PLATFORM_LABELS]}</dd></div>
          <div><dt className="text-gray-500">Item</dt><dd>{sale.item ? <Link href={`/inventory/${sale.item.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{sale.item.name}</Link> : '—'}</dd></div>
          <div><dt className="text-gray-500">Sold price</dt><dd>{formatCurrency(sale.soldPrice)}</dd></div>
          <div><dt className="text-gray-500">Shipping collected</dt><dd>{formatCurrency(sale.shippingCollected)}</dd></div>
          <div><dt className="text-gray-500">Shipping cost</dt><dd>{formatCurrency(sale.shippingCost)}</dd></div>
          <div><dt className="text-gray-500">Sales tax</dt><dd>{formatCurrency(sale.salesTax)}</dd></div>
          <div><dt className="text-gray-500">Platform fees</dt><dd>{formatCurrency(sale.platformFees)}</dd></div>
          <div><dt className="text-gray-500">Refund</dt><dd>{sale.refundType !== 'none' ? `${formatCurrency(sale.refundAmount)} (${REFUND_TYPE_LABELS[sale.refundType as keyof typeof REFUND_TYPE_LABELS]})` : 'None'}</dd></div>
          <div><dt className="text-gray-500">Profit</dt><dd className={profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{formatCurrency(profit)}</dd></div>
        </dl>
        {sale.refundReason && <p className="mt-4 text-sm text-gray-600 dark:text-gray-300"><strong>Refund reason:</strong> {sale.refundReason}</p>}
        {canEdit && <SaleDetailActions saleId={sale.id} />}
      </div>
    </AppShell>
  );
}