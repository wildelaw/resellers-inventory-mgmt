'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmModal from '@/components/ConfirmModal';
import RefundEntryModal from '@/components/RefundEntryModal';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

interface Sale {
  id: number;
  itemId: number | null;
  soldDate: number;
  soldPrice: number;
  shippingCost: number | null;
  shippingCollected: number | null;
  platform: string;
  salesTax: number | null;
  platformFees: number | null;
  refundAmount: number | null;
  refundReason: string | null;
  refundType: string;
  soldBy: number;
  createdAt: number;
}

interface SaleDetailClientProps {
  sale: Sale;
  itemName: string | null;
  itemId: number | null;
  profit: number;
  canEdit: boolean;
  platformLabels: Record<string, string>;
}

export default function SaleDetailClient({
  sale,
  itemName,
  itemId,
  profit,
  canEdit,
  platformLabels,
}: SaleDetailClientProps) {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/sales/${sale.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete sale');
      }
      router.push('/sales');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete sale');
    }
  };

  const handleRefund = async (data: { saleId: number; refundAmount: number; refundReason: string; refundType: 'refund_no_return' | 'refund_with_return' }) => {
    try {
      const res = await fetch('/api/sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to process refund');
      }
      router.refresh();
    } catch (err) {
      throw err;
    }
  };

  const hasRefund = sale.refundType !== 'none' && sale.refundAmount && sale.refundAmount > 0;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sale Details</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Created {formatDateTime(sale.createdAt)}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {sale.refundType === 'none' && (
              <button
                onClick={() => setRefundModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors"
              >
                Process Refund
              </button>
            )}
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {itemId && (
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Item</dt>
              <dd className="mt-1 text-sm">
                <Link href={`/inventory/${itemId}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                  {itemName || `Item #${itemId}`}
                </Link>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Sale Date</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(sale.soldDate)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Sold Price</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatCurrency(sale.soldPrice)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Platform</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{platformLabels[sale.platform] || sale.platform}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Shipping Cost</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatCurrency(sale.shippingCost)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Shipping Collected</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatCurrency(sale.shippingCollected)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Sales Tax</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatCurrency(sale.salesTax)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Platform Fees</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatCurrency(sale.platformFees)}</dd>
          </div>
        </dl>

        {/* Profit Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-900 dark:text-white">Profit</span>
            <span className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(profit)}
            </span>
          </div>
        </div>

        {/* Refund Info */}
        {hasRefund && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Refund Information</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Refund Amount</dt>
                <dd className="mt-1 text-sm text-red-600 font-medium">{formatCurrency(sale.refundAmount)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Refund Type</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {sale.refundType === 'refund_no_return' ? 'Refund No Return' : 'Refund With Return'}
                </dd>
              </div>
              {sale.refundReason && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Refund Reason</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{sale.refundReason}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Sale"
        message="Are you sure you want to delete this sale? If the sale was linked to an item, the item will be marked as Available again."
        confirmLabel="Delete"
        danger
      />

      <RefundEntryModal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        onRefund={handleRefund}
        saleId={sale.id}
        salePrice={sale.soldPrice}
      />
    </main>
  );
}