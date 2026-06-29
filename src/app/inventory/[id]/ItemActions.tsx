'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiPut, apiDelete, apiFetch } from '@/lib/api-client';
import { ALL_STATUSES, STATUS_LABELS, isValidTransition, getAllowedTransitions } from '@/lib/constants';
import type { ItemStatus } from '@/lib/constants';
import ConfirmModal from '@/components/ConfirmModal';

export default function ItemActions({ itemId, currentStatus }: { itemId: number; currentStatus: ItemStatus }) {
  const [status, setStatus] = useState<ItemStatus>(currentStatus);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const allowed = getAllowedTransitions(currentStatus);

  async function changeStatus(newStatus: ItemStatus) {
    setBusy(true); setError('');
    const res = await apiPut(`/api/inventory/${itemId}`, { status: newStatus });
    setBusy(false);
    if (!res.ok) { setError(res.error || 'Failed to update status'); return; }
    setStatus(newStatus);
    router.refresh();
  }

  async function doDelete() {
    setConfirmDelete(false);
    const res = await apiDelete(`/api/inventory/${itemId}`);
    if (res.ok) router.push('/inventory');
    else setError(res.error || 'Failed to delete item');
  }

  async function uploadPhoto(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true); setError('');
    const res = await apiFetch(`/api/inventory/${itemId}/photo`, { method: 'POST', body: (() => { const fd = new FormData(); fd.append('photo', file); return fd; })() });
    setBusy(false);
    if (!res.ok) { setError(res.error || 'Upload failed'); return; }
    if (fileRef.current) fileRef.current.value = '';
    router.refresh();
  }

  return (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-gray-500">Change status:</label>
        <select
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
          value={status}
          disabled={busy}
          onChange={(e) => changeStatus(e.target.value as ItemStatus)}
        >
          <option value={currentStatus}>{STATUS_LABELS[currentStatus]} (current)</option>
          {ALL_STATUSES.filter((s) => s !== currentStatus && (isValidTransition(currentStatus, s))).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        {allowed.length === 0 && <span className="text-xs text-gray-500">(terminal status)</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/sales/new?itemId=${itemId}`} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm">Record sale</Link>
        <button onClick={() => setConfirmDelete(true)} disabled={busy} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm disabled:opacity-60">Delete item</button>
      </div>

      <form onSubmit={uploadPhoto} className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="text-xs" />
        <button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm disabled:opacity-60">Upload photo</button>
      </form>

      <ConfirmModal
        open={confirmDelete}
        title="Delete this item?"
        message="This permanently deletes the item, its photos, and its sales records."
        danger
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}