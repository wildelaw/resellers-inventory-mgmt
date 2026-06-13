'use client';

import { useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PLATFORM_LABELS } from '@/lib/constants';
import RefundEntryModal from '@/components/RefundEntryModal';
import ConfirmModal from '@/components/ConfirmModal';
import { calculateProfit } from '@/lib/financial';

interface Props { sale: any; }

export default function SaleDetailClient({ sale }: Props) {
  const [showRefund, setShowRefund] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const profit = calculateProfit({
    soldPrice: sale.soldPrice,
    shippingCollected: sale.shippingCollected,
    salesTax: sale.salesTax,
    platformFees: sale.platformFees,
    refundAmount: sale.refundAmount,
    purchasePrice: sale.item?.purchasePrice ?? 0,
    shippingCost: sale.shippingCost,
  });

  const deleteSale = async () => {
    await fetch(`/api/sales/${sale.id}`, { method: 'DELETE' });
    window.location.href = '/sales';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sale #{sale.id}</h1>
        <div className="flex space-x-2">
          {sale.refundType === 'none' && <button onClick={() => setShowRefund(true)} className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white">Process Refund</button>}
          <button onClick={() => setShowDelete(true)} className="px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white">Delete</button>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-4">
          <div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Item</span><p className="text-gray-900 dark:text-white">{sale.item?.name || 'Unlinked'}</p></div>
          <div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</span><p className="text-gray-900 dark:text-white">{formatDate(sale.soldDate)}</p></div>
          <div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Sale Price</span><p className="text-gray-900 dark:text-white font-semibold">{formatCurrency(sale.soldPrice)}</p></div>
          <div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Platform</span><p className="text-gray-900 dark:text-white">{PLATFORM_LABELS[sale.platform as keyof typeof PLATFORM_LABELS] || sale.platform}</p></div>
          {sale.shippingCost != null && <div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Shipping Cost</span><p className="text-gray-900 dark:text-white">{formatCurrency(sale.shippingCost)}</p></div>}
          {sale.shippingCollected != null && <div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Shipping Collected</span><p className="text-gray-900 dark:text-white">{formatCurrency(sale.shippingCollected)}</p></div>}
          {sale.salesTax != null && <div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Sales Tax</span><p className="text-gray-900 dark:text-white">{formatCurrency(sale.salesTax)}</p></div>}
          {sale.platformFees != null && <div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Platform Fees</span><p className="text-gray-900 dark:text-white">{formatCurrency(sale.platformFees)}</p></div>}
          <div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Profit</span><p className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(profit)}</p></div>
          {sale.refundType !== 'none' && (<><div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Refund Amount</span><p className="text-red-600 font-semibold">{formatCurrency(sale.refundAmount || 0)}</p></div><div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Refund Type</span><p className="text-gray-900 dark:text-white">{sale.refundType === 'refund_with_return' ? 'Refund with Return' : 'Refund (No Return)'}</p></div></>)}
        </div>
      </div>
      <RefundEntryModal isOpen={showRefund} onClose={() => setShowRefund(false)} onRefunded={() => window.location.reload()} saleId={sale.id} />
      <ConfirmModal isOpen={showDelete} title="Delete Sale" message="Are you sure? The item status will be reverted to available." confirmLabel="Delete" variant="danger" onConfirm={deleteSale} onCancel={() => setShowDelete(false)} />
    </div>
  );
}