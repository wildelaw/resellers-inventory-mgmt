'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STATUS_LABELS, STATUS_COLORS, ALL_STATUSES, type ItemStatus } from '@/lib/constants';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';
import ConfirmModal from '@/components/ConfirmModal';

interface Photo { id: number; itemId: number; filename: string; isPrimary: boolean; }
interface Sale { id: number; soldPrice: number; platform: string; soldDate: number; }
interface Item {
  id: number; name: string; description: string | null;
  purchaseDate: number; purchasePrice: number; purchaseLocation: string | null;
  category: string | null; status: ItemStatus; notes: string | null;
  ownerId: number; createdAt: number; updatedAt: number;
  photos: Photo[]; sales: Sale[];
}

interface Props {
  initialItems: Item[];
  initialCategories: string[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  initialStatus?: string;
  initialCategory?: string;
  initialSearch?: string;
}

export default function InventoryClient({
  initialItems, initialCategories, initialTotal,
  initialPage, initialPageSize,
  initialStatus = '', initialCategory = '', initialSearch = '',
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<ItemStatus>('donated');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setItems(initialItems); }, [initialItems]);

  const toggleSelect = (id: number) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkUpdateStatus = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), status: bulkStatus }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Failed' }));
        setError(d.error || 'Failed');
        return;
      }
      router.refresh();
      setSelected(new Set());
    } finally {
      setBusy(false);
    }
  }, [selected, bulkStatus, router]);

  const bulkDelete = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const ids = Array.from(selected);
      const url = `/api/inventory/bulk?ids=${ids.join(',')}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Failed' }));
        setError(d.error || 'Failed');
        return;
      }
      setConfirmDelete(false);
      router.refresh();
      setSelected(new Set());
    } finally {
      setBusy(false);
    }
  }, [selected, router]);

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-100 text-sm">
          {error}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status filter</label>
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            value={initialStatus}
            onChange={(e) => router.push(`/inventory?status=${encodeURIComponent(e.target.value)}`)}
          >
            <option value="">All</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            value={initialCategory}
            onChange={(e) => router.push(`/inventory?category=${encodeURIComponent(e.target.value)}`)}
          >
            <option value="">All</option>
            {initialCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <form
          className="flex-1 min-w-[200px]"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            router.push(`/inventory?search=${encodeURIComponent(String(fd.get('search') ?? ''))}`);
          }}
        >
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
          <input
            name="search"
            defaultValue={initialSearch}
            placeholder="Name, description, location"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
        </form>
        <Link href="/inventory/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
          Add Item
        </Link>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <select
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as ItemStatus)}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button
            onClick={bulkUpdateStatus}
            disabled={busy}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            Update status
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
          >
            Delete selected
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center text-gray-500 dark:text-gray-400">
          No items found. Try adjusting filters or add a new item.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set(items.map((i) => i.id)));
                      else setSelected(new Set());
                    }}
                    checked={selected.size === items.length && items.length > 0}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Purchased</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => {
                const primaryPhoto = item.photos.find((p) => p.isPrimary) ?? item.photos[0];
                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {primaryPhoto && (
                          <img
                            src={getPhotoUrl(item.id, primaryPhoto.filename)}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <Link href={`/inventory/${item.id}`} className="font-medium hover:text-blue-600">
                          {item.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(item.purchaseDate)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(item.purchasePrice)}</td>
                    <td className="px-4 py-3 text-sm">{item.category ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/inventory/${item.id}/edit`} className="text-blue-600 hover:underline text-sm mr-3">
                        Edit
                      </Link>
                      <Link href={`/inventory/${item.id}`} className="text-gray-600 dark:text-gray-300 hover:underline text-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete}
        title="Delete selected items"
        message={`Permanently delete ${selected.size} item(s)? This also deletes related photos and sales.`}
        confirmLabel="Delete"
        danger
        onConfirm={bulkDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}