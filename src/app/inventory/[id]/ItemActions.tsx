'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STATUS_LABELS, type ItemStatus } from '@/lib/constants';

interface ItemActionsProps {
  itemId: number;
  currentStatus: ItemStatus;
  allowedTransitions: ItemStatus[];
  canEdit: boolean;
}

export default function ItemActions({ itemId, currentStatus, allowedTransitions, canEdit }: ItemActionsProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!canEdit || allowedTransitions.length === 0) return null;

  const handleStatusChange = async (newStatus: ItemStatus) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) router.refresh();
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {allowedTransitions.map((s) => (
        <button
          key={s}
          onClick={() => handleStatusChange(s)}
          disabled={loading}
          className="btn-secondary text-sm"
        >
          Mark as {STATUS_LABELS[s]}
        </button>
      ))}
    </div>
  );
}