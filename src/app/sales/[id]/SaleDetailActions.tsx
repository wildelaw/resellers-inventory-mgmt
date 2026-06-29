'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RefundEntryModal from '@/components/RefundEntryModal';
import ConfirmModal from '@/components/ConfirmModal';

interface Props {
  saleId: number;
  refundType: 'none' | 'refund_no_return' | 'refund_with_return';
  canEdit: boolean;
}

export default function SaleDetailActions({ saleId, refundType, canEdit }: Props) {
  const router = useRouter();
  const [refundOpen, setRefundOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales/${saleId}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Failed' }));
        setError(d.error || 'Failed');
        return;
      }
      router.push('/sales');
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit) return null;

  return (
    <div className="flex gap-2">
      {error && <span className="text-red-600 text-sm">{error}</span>}
      {refundType === 'none' && (
        <button
          onClick={() => setRefundOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-md text-sm"
        >
          Process refund
        </button>
      )}
      <button
        onClick={() => setDeleteOpen(true)}
        className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm"
      >
        Delete
      </button>
      <RefundEntryModal
        open={refundOpen}
        saleId={saleId}
        onClose={() => setRefundOpen(false)}
        onSaved={() => { setRefundOpen(false); router.refresh(); }}
      />
      <ConfirmModal
        open={deleteOpen}
        title="Delete sale"
        message="Delete this sale record? The linked item's status will revert to available."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}