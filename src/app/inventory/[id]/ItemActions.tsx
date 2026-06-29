'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ALLOWED_TRANSITIONS, STATUS_LABELS, type ItemStatus } from '@/lib/constants';

interface Props {
  itemId: number;
  status: ItemStatus;
  canEdit: boolean;
}

export default function ItemActions({ itemId, status, canEdit }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeStatus = async (next: ItemStatus) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Failed' }));
        setError(d.error || 'Failed');
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this item? Related photos and sales will be removed.')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/${itemId}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Failed' }));
        setError(d.error || 'Failed');
        return;
      }
      router.push('/inventory');
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit) return null;

  const allowed = ALLOWED_TRANSITIONS[status] ?? [];

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {error && <span className="text-red-600 text-sm">{error}</span>}
      {allowed.length > 0 && (
        <select
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
          value=""
          onChange={(e) => {
            const v = e.target.value as ItemStatus;
            if (v) changeStatus(v);
          }}
          disabled={busy}
        >
          <option value="">Change status…</option>
          {allowed.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      )}
      <Link href={`/inventory/${itemId}/edit`} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-2 rounded-md text-sm">
        Edit
      </Link>
      <button
        onClick={remove}
        disabled={busy}
        className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm"
      >
        Delete
      </button>
    </div>
  );
}