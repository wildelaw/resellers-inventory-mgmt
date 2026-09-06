'use client';

import { useState } from 'react';
import RefundEntryModal from '@/components/RefundEntryModal';
import ConfirmModal from '@/components/ConfirmModal';
import { useRouter } from 'next/navigation';

interface Props {
  saleId: number;
  soldPrice: number;
  refundAmount: number;
}

export default function SaleDetailActions({ saleId, soldPrice, refundAmount }: Props) {
  const router = useRouter();
  const [refundOpen, setRefundOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleteOpen(false);
    const res = await fetch(`/api/sales/${saleId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Delete failed');
      return;
    }
    router.push('/sales');
  };

  return (
    <div className="max-w-2xl">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md text-sm">{error}</div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => setRefundOpen(true)}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm"
        >
          {refundAmount > 0 ? 'Update Refund' : 'Process Refund'}
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm"
        >
          Delete Sale
        </button>
      </div>

      <RefundEntryModal
        isOpen={refundOpen}
        onClose={() => setRefundOpen(false)}
        saleId={saleId}
        soldPrice={soldPrice}
      />

      <ConfirmModal
        isOpen={deleteOpen}
        title="Delete Sale"
        message="Delete this sale? If the item was sold, it will revert to available."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}