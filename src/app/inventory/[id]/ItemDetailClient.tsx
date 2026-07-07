'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STATUS_LABELS, type ItemStatus } from '@/lib/constants';

export default function ItemDetailClient({ itemId, currentStatus, allowedTransitions }: { itemId: number; currentStatus: ItemStatus; allowedTransitions: ItemStatus[] }) {
  const [newStatus, setNewStatus] = useState<ItemStatus | ''>('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStatusChange = async () => {
    if (!newStatus) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (allowedTransitions.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as ItemStatus)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white">
        <option value="">Change status...</option>
        {allowedTransitions.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
      </select>
      <button onClick={handleStatusChange} disabled={loading || !newStatus} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm disabled:opacity-50">{loading ? 'Updating...' : 'Update'}</button>
    </div>
  );
}
