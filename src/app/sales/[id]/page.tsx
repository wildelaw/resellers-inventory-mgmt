'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/header';
import RefundEntryModal from '@/components/RefundEntryModal';
import ConfirmModal from '@/components/ConfirmModal';
import { PLATFORM_LABELS, REFUND_TYPE_LABELS, type SalePlatform, type RefundType } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';

interface Sale {
  id: number;
  itemId: number | null;
  soldDate: number;
  soldPrice: number;
  shippingCost: number | null;
  shippingCollected: number | null;
  platform: SalePlatform;
  salesTax: number | null;
  platformFees: number | null;
  refundAmount: number | null;
  refundReason: string | null;
  refundType: RefundType;
  soldBy: number;
  item?: { id: number; name: string; purchasePrice: number; status: string } | null;
  seller?: { name: string } | null;
}

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [showRefund, setShowRefund] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    params.then((p) => {
      fetch(`/api/sales/${p.id}`).then((r) => r.json()).then(setSale);
    });
  }, [params]);

  if (!sale) return <div><Header /><main className="max-w-4xl mx-auto px-4 py-8">Loading...</main></div>;

  const profit = calculateProfit({
    soldPrice: sale.soldPrice,
    shippingCollected: sale.shippingCollected,
    salesTax: sale.salesTax,
    platformFees: sale.platformFees,
    refundAmount: sale.refundAmount,
    purchasePrice: sale.item?.purchasePrice ?? 0,
    shippingCost: sale.shippingCost,
  });

  const handleDelete = async () => {
    const res = await fetch(`/api/sales/${sale.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/sales');
      router.refresh();
    } else {
      setError('Failed to delete sale');
    }
  };

  return (
    <div>
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/sales" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Sales</Link>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        <div className="card">
          <h1 className="text-2xl font-bold mb-4">Sale #{sale.id}</h1>
          <dl className="space-y-2">
            {sale.item && <div className="flex justify-between"><dt className="text-gray-500">Item:</dt><dd><Link href={`/inventory/${sale.item.id}`} className="text-blue-600 hover:underline">{sale.item.name}</Link></dd></div>}
            <div className="flex justify-between"><dt className="text-gray-500">Date:</dt><dd>{formatDate(sale.soldDate)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Platform:</dt><dd>{PLATFORM_LABELS[sale.platform]}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Sold Price:</dt><dd>{formatCurrency(sale.soldPrice)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Shipping Cost:</dt><dd>{formatCurrency(sale.shippingCost)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Shipping Collected:</dt><dd>{formatCurrency(sale.shippingCollected)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Sales Tax:</dt><dd>{formatCurrency(sale.salesTax)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Platform Fees:</dt><dd>{formatCurrency(sale.platformFees)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Seller:</dt><dd>{sale.seller?.name || '—'}</dd></div>
            <div className="flex justify-between font-bold border-t pt-2 dark:border-gray-700"><dt>Profit:</dt><dd className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(profit)}</dd></div>
          </dl>
          {sale.refundType !== 'none' && (
            <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded">
              <p className="font-semibold">Refund: {REFUND_TYPE_LABELS[sale.refundType]}</p>
              <p>Amount: {formatCurrency(sale.refundAmount)}</p>
              {sale.refundReason && <p>Reason: {sale.refundReason}</p>}
            </div>
          )}
          <div className="mt-6 flex gap-2">
            {sale.refundType === 'none' && <button onClick={() => setShowRefund(true)} className="btn-secondary">Process Refund</button>}
            <button onClick={() => setShowDelete(true)} className="btn-danger">Delete Sale</button>
          </div>
        </div>
      </main>
      <RefundEntryModal
        open={showRefund}
        saleId={sale.id}
        onClose={() => setShowRefund(false)}
        onSuccess={() => { setShowRefund(false); router.refresh(); }}
      />
      <ConfirmModal
        open={showDelete}
        title="Delete Sale"
        message="Delete this sale? The linked item will be reverted to available."
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}