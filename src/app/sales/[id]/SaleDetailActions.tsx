'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiDelete } from '@/lib/api-client';
import RefundEntryModal from '@/components/RefundEntryModal';
import ConfirmModal from '@/components/ConfirmModal';

export default function SaleDetailActions({ saleId }: { saleId: number }) {
  const [refundOpen, setRefundOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function doDelete() {
    setDeleteOpen(false);
    const res = await apiDelete(`/api/sales/${saleId}`);
    if (res.ok) router.push('/sales');
    else setError(res.error || 'Failed to delete sale');
  }

  return (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4 flex gap-2">
      {error && <p className="text-sm text-red-600 mr-auto">{error}</p>}
      <button onClick={() => setRefundOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-md text-sm">Process refund</button>
      <button onClick={() => setDeleteOpen(true)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm">Delete sale</button>
      <RefundEntryModal open={refundOpen} saleId={saleId} onClose={() => setRefundOpen(false)} onRefunded={() => { setRefundOpen(false); router.refresh(); }} />
      <ConfirmModal open={deleteOpen} title="Delete this sale?" message="The linked item will revert to available." danger confirmLabel="Delete" onConfirm={doDelete} onCancel={() => setDeleteOpen(false)} />
    </div>
  );
}