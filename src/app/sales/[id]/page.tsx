'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { PLATFORM_LABELS, type Platform } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';
import RefundEntryModal from '@/components/RefundEntryModal';
import ConfirmModal from '@/components/ConfirmModal';
import SalesEntryModal from '@/components/SalesEntryModal';

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { id } = await params;
      const res = await fetch(`/api/sales/${id}`);
      if (res.ok) {
        setSale(await res.json());
      }
      setLoading(false);
    })();
  }, [params]);

  const handleDelete = async () => {
    const { id } = await params;
    try {
      await fetch(`/api/sales/${id}`, { method: 'DELETE' });
      router.push('/sales');
    } catch {
      alert('Failed to delete sale');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8"><p className="text-gray-500">Loading...</p></main>
    </div>
  );

  if (!sale) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8"><p className="text-gray-500">Sale not found</p></main>
    </div>
  );

  const profit = calculateProfit({
    soldPrice: sale.soldPrice,
    shippingCollected: sale.shippingCollected,
    salesTax: sale.salesTax,
    platformFees: sale.platformFees,
    refundAmount: sale.refundAmount,
    purchasePrice: sale.item?.purchasePrice ?? 0,
    shippingCost: sale.shippingCost,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/sales" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block">← Back to Sales</Link>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sale Details</h1>
          <div className="flex space-x-2">
            <button onClick={() => setShowEditModal(true)} className="btn-secondary">Edit</button>
            {sale.refundType === 'none' && (
              <button onClick={() => setShowRefundModal(true)} className="btn-secondary">Process Refund</button>
            )}
            <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger">Delete</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Sale Information</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Sale Date</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{formatDate(sale.soldDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Platform</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{PLATFORM_LABELS[sale.platform as Platform] || sale.platform}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Sold Price</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{formatCurrency(sale.soldPrice)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Shipping Cost</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{formatCurrency(sale.shippingCost)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Shipping Collected</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{formatCurrency(sale.shippingCollected)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Sales Tax</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{formatCurrency(sale.salesTax)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Platform Fees</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{formatCurrency(sale.platformFees)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3">
                <dt className="text-sm font-medium text-gray-700 dark:text-gray-300">Profit</dt>
                <dd className={`font-bold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(profit)}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-6">
            {sale.item && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Linked Item</h2>
                <Link href={`/inventory/${sale.item.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {sale.item.name}
                </Link>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Purchase Price: {formatCurrency(sale.item.purchasePrice)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status: {sale.item.status}</p>
              </div>
            )}

            {sale.refundAmount > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Refund Information</h2>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Refund Amount</dt>
                    <dd className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(sale.refundAmount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Refund Type</dt>
                    <dd className="text-gray-900 dark:text-white">{sale.refundType}</dd>
                  </div>
                  {sale.refundReason && (
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Reason</dt>
                      <dd className="text-gray-900 dark:text-white">{sale.refundReason}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>

        <RefundEntryModal
          open={showRefundModal}
          saleId={sale.id}
          salePrice={sale.soldPrice}
          onClose={() => setShowRefundModal(false)}
          onSuccess={() => router.refresh()}
        />

        <SalesEntryModal
          open={showEditModal}
          saleId={sale.id}
          initialData={sale}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => router.refresh()}
        />

        <ConfirmModal
          open={showDeleteConfirm}
          title="Delete Sale"
          message="Delete this sale? The linked item status will be reverted to available."
          confirmText="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </main>
    </div>
  );
}