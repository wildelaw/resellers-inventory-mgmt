'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RefundEntryModal from '@/components/RefundEntryModal';

export default function SaleDetailClient({ saleId, hasRefund }: { saleId: number; hasRefund: boolean }) {
  const [showRefund, setShowRefund] = useState(false);
  const router = useRouter();

  return (
    <div className="flex gap-2">
      {!hasRefund && (
        <button onClick={() => setShowRefund(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm">Process Refund</button>
      )}
      <button onClick={() => { if (confirm('Delete this sale? Item status will revert to available.')) { fetch(`/api/sales/${saleId}`, { method: 'DELETE' }).then(() => router.push('/sales')); } }} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm">Delete Sale</button>
      <RefundEntryModal open={showRefund} saleId={saleId} onClose={() => setShowRefund(false)} onSuccess={() => router.refresh()} />
    </div>
  );
}
