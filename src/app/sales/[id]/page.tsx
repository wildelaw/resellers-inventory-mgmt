import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { sales } from '@/lib/schema';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PLATFORM_LABELS } from '@/lib/constants';
import { calculateProfit } from '@/lib/financial';
import Header from '@/components/header';
import Link from 'next/link';
import SaleDetailClient from './SaleDetailClient';

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const saleId = Number(id);

  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
    with: { item: true },
  });
  if (!sale) redirect('/sales');

  const profit = calculateProfit({ ...sale, purchasePrice: sale.item?.purchasePrice ?? 0 });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/sales" className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block">← Back to Sales</Link>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Sale #{sale.id}</h1>
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div><span className="text-gray-500">Item:</span> {sale.item ? <Link href={`/inventory/${sale.item.id}`} className="text-blue-600">{sale.item.name}</Link> : 'No item'}</div>
            <div><span className="text-gray-500">Date:</span> {formatDate(sale.soldDate)}</div>
            <div><span className="text-gray-500">Sold Price:</span> {formatCurrency(sale.soldPrice)}</div>
            <div><span className="text-gray-500">Platform:</span> {PLATFORM_LABELS[sale.platform as keyof typeof PLATFORM_LABELS] ?? sale.platform}</div>
            <div><span className="text-gray-500">Shipping Cost:</span> {formatCurrency(sale.shippingCost)}</div>
            <div><span className="text-gray-500">Shipping Collected:</span> {formatCurrency(sale.shippingCollected)}</div>
            <div><span className="text-gray-500">Sales Tax:</span> {formatCurrency(sale.salesTax)}</div>
            <div><span className="text-gray-500">Platform Fees:</span> {formatCurrency(sale.platformFees)}</div>
            <div className="col-span-2"><span className="text-gray-500">Profit:</span> <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(profit)}</span></div>
            {sale.refundAmount > 0 && (
              <>
                <div><span className="text-gray-500">Refund Amount:</span> <span className="text-red-600">{formatCurrency(sale.refundAmount)}</span></div>
                <div><span className="text-gray-500">Refund Type:</span> {sale.refundType}</div>
                {sale.refundReason && <div className="col-span-2"><span className="text-gray-500">Refund Reason:</span> {sale.refundReason}</div>}
              </>
            )}
          </div>
          <SaleDetailClient saleId={sale.id} hasRefund={sale.refundAmount > 0} />
        </div>
      </main>
    </div>
  );
}
