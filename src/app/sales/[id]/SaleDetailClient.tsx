'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import ConfirmModal from '@/components/ConfirmModal';
import RefundEntryModal from '@/components/RefundEntryModal';
import SalesEntryModal from '@/components/SalesEntryModal';
import { PLATFORM_LABELS, REFUND_TYPE_LABELS } from '@/lib/constants';
import type { Platform } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';

interface SaleDetail {
  id: number;
  soldDate: string | Date;
  soldPrice: number;
  shippingCost?: number | null;
  shippingCollected?: number | null;
  platform: Platform;
  salesTax?: number | null;
  platformFees?: number | null;
  refundAmount?: number | null;
  refundReason?: string | null;
  refundType: string;
  item?: { id: number; name: string; purchasePrice: number; status: string } | null;
  seller?: { id: number; name: string; email: string } | null;
}

interface Props { sale: SaleDetail; canEdit: boolean; }

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

export default function SaleDetailClient({ sale, canEdit }: Props) {
  const router = useRouter();
  const [currentSale, setCurrentSale] = useState<SaleDetail>(sale);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/sales/${currentSale.id}`, { method: 'DELETE' });
      if (res.ok) router.push('/sales');
    } finally {
      setDeleteLoading(false);
    }
  };

  const refreshSale = async () => {
    const res = await fetch(`/api/sales/${currentSale.id}`);
    const data = await res.json();
    setCurrentSale(data);
  };

  const profit = currentSale.item ? calculateProfit({
    soldPrice: currentSale.soldPrice,
    shippingCollected: currentSale.shippingCollected,
    salesTax: currentSale.salesTax,
    platformFees: currentSale.platformFees,
    refundAmount: currentSale.refundAmount,
    purchasePrice: currentSale.item.purchasePrice,
    shippingCost: currentSale.shippingCost,
  }) : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <Link href="/sales" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
            ← Back to Sales
          </Link>
        </div>

        <div className="flex justify-between items-start mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sale Details</h1>
          {canEdit && (
            <div className="flex gap-2">
              {currentSale.refundType === 'none' && (
                <button
                  onClick={() => setRefundOpen(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors"
                >
                  Process Refund
                </button>
              )}
              <button
                onClick={() => setEditOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-1">
          {currentSale.item && (
            <DetailRow
              label="Item"
              value={
                <Link href={`/inventory/${currentSale.item.id}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  {currentSale.item.name}
                </Link>
              }
            />
          )}
          <DetailRow label="Sale Date" value={formatDate(currentSale.soldDate)} />
          <DetailRow label="Platform" value={PLATFORM_LABELS[currentSale.platform]} />
          <DetailRow label="Sold Price" value={formatCurrency(currentSale.soldPrice)} />
          {currentSale.shippingCollected != null && currentSale.shippingCollected > 0 && (
            <DetailRow label="Shipping Collected" value={formatCurrency(currentSale.shippingCollected)} />
          )}
          {currentSale.shippingCost != null && currentSale.shippingCost > 0 && (
            <DetailRow label="Shipping Cost" value={formatCurrency(currentSale.shippingCost)} />
          )}
          {currentSale.salesTax != null && currentSale.salesTax > 0 && (
            <DetailRow label="Sales Tax" value={formatCurrency(currentSale.salesTax)} />
          )}
          {currentSale.platformFees != null && currentSale.platformFees > 0 && (
            <DetailRow label="Platform Fees" value={formatCurrency(currentSale.platformFees)} />
          )}
          {currentSale.item && (
            <DetailRow label="Purchase Price" value={formatCurrency(currentSale.item.purchasePrice)} />
          )}
          {profit !== null && (
            <div className="flex justify-between py-2 border-t dark:border-gray-600 mt-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Profit</span>
              <span className={`text-sm font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(profit)}
              </span>
            </div>
          )}
        </div>

        {currentSale.refundType !== 'none' && (
          <div className="mt-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2">Refund Applied</h3>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              {REFUND_TYPE_LABELS[currentSale.refundType as keyof typeof REFUND_TYPE_LABELS]} — {formatCurrency(currentSale.refundAmount || 0)}
            </p>
            {currentSale.refundReason && (
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">{currentSale.refundReason}</p>
            )}
          </div>
        )}

        {currentSale.seller && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Sold by {currentSale.seller.name}
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Sale"
        message="Are you sure you want to delete this sale? The item status will revert to available."
        confirmLabel="Delete"
        danger
        loading={deleteLoading}
      />

      <RefundEntryModal
        isOpen={refundOpen}
        onClose={() => setRefundOpen(false)}
        onSuccess={refreshSale}
        saleId={currentSale.id}
        soldPrice={currentSale.soldPrice}
      />

      {editOpen && (
        <SalesEntryModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          onSuccess={() => { setEditOpen(false); refreshSale(); }}
          editSale={{
            id: currentSale.id,
            soldDate: new Date(currentSale.soldDate).toISOString().split('T')[0],
            soldPrice: currentSale.soldPrice,
            shippingCost: currentSale.shippingCost,
            shippingCollected: currentSale.shippingCollected,
            platform: currentSale.platform,
            salesTax: currentSale.salesTax,
            platformFees: currentSale.platformFees,
            itemId: currentSale.item?.id,
          }}
          items={currentSale.item ? [currentSale.item as any] : []}
        />
      )}
    </div>
  );
}
