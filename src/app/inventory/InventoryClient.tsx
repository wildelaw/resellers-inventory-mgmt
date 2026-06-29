'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiPatch, apiDelete } from '@/lib/api-client';
import { STATUS_LABELS, STATUS_BADGE_CLASSES, ALL_STATUSES } from '@/lib/constants';
import type { ItemStatus } from '@/lib/constants';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';
import ConfirmModal from '@/components/ConfirmModal';

export interface InventoryItemView {
  id: number;
  name: string;
  description: string | null;
  purchaseDate: number;
  purchasePrice: number;
  purchaseLocation: string | null;
  category: string | null;
  status: ItemStatus;
  notes: string | null;
  removalDate: number | null;
  ownerId: number;
  createdAt: number;
  updatedAt: number;
  photos?: { id: number; filename: string; isPrimary: number }[];
}

interface Props {
  initialItems: InventoryItemView[];
  initialPagination: { page: number; pageSize: number; total: number; totalPages: number };
  categories: string[];
  statuses: string[];
  canEditOthers: boolean;
}

export default function InventoryClient({ initialItems, initialPagination, categories, statuses }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ItemStatus>('donated');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy] = useTransition();
  const router = useRouter();

  const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const statusFilter = sp.get('status') || '';
  const categoryFilter = sp.get('category') || '';
  const searchFilter = sp.get('search') || '';

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value); else params.delete(key);
    params.set('page', '1');
    router.push(`/inventory?${params.toString()}`);
  }

  function toggle(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function bulkUpdateStatus() {
    if (selected.size === 0) return;
    const res = await apiPatch('/api/inventory/bulk', { ids: Array.from(selected), status: bulkStatus });
    if (res.ok) { setSelected(new Set()); router.refresh(); }
    else alert(res.error || 'Bulk update failed');
  }

  async function bulkDelete() {
    setConfirmDelete(false);
    const ids = Array.from(selected);
    const res = await apiDelete(`/api/inventory/bulk?ids=${ids.join(',')}`);
    if (res.ok) { setSelected(new Set()); router.refresh(); }
    else alert(res.error || 'Bulk delete failed');
  }

  const inputClass = 'px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <Link href="/inventory/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">Add Item</Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 flex flex-wrap gap-2">
        <input className={inputClass} placeholder="Search…" defaultValue={searchFilter}
          onChange={(e) => applyFilter('search', e.target.value)} />
        <select className={inputClass} value={statusFilter} onChange={(e) => applyFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{STATUS_LABELS[s as ItemStatus]}</option>)}
        </select>
        <select className={inputClass} value={categoryFilter} onChange={(e) => applyFilter('category', e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Link href="/inventory" className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Clear</Link>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <select className={inputClass} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as ItemStatus)}>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button disabled={busy} onClick={bulkUpdateStatus} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm disabled:opacity-60">Update status</button>
          <button disabled={busy} onClick={() => setConfirmDelete(true)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm disabled:opacity-60">Delete selected</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-left">
            <tr>
              <th className="p-3 w-8"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(initialItems.map((i) => i.id)) : new Set())} /></th>
              <th className="p-3">Item</th>
              <th className="p-3">Category</th>
              <th className="p-3">Purchased</th>
              <th className="p-3">Price</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {initialItems.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">No items found.</td></tr>
            )}
            {initialItems.map((it) => {
              const photo = it.photos?.find((p) => p.isPrimary === 1) || it.photos?.[0];
              return (
                <tr key={it.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="p-3"><input type="checkbox" checked={selected.has(it.id)} onChange={() => toggle(it.id)} /></td>
                  <td className="p-3">
                    <Link href={`/inventory/${it.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2">
                      {photo && <img src={getPhotoUrl(it.id, photo.filename)} alt="" className="w-8 h-8 rounded object-cover" />}
                      {it.name}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{it.category || '—'}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{formatDate(it.purchaseDate)}</td>
                  <td className="p-3">{formatCurrency(it.purchasePrice)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${STATUS_BADGE_CLASSES[it.status]}`}>{STATUS_LABELS[it.status]}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-300">
        <span>{initialPagination.total} item{initialPagination.total === 1 ? '' : 's'}</span>
        <div className="flex gap-1">
          {Array.from({ length: Math.max(1, initialPagination.totalPages) }, (_, i) => i + 1).slice(0, 10).map((p) => (
            <Link key={p} href={`/inventory?page=${p}`} className={`px-3 py-1 rounded ${p === initialPagination.page ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{p}</Link>
          ))}
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Delete selected items?"
        message={`This will permanently delete ${selected.size} item(s) and their photos/sales.`}
        danger
        confirmLabel="Delete"
        onConfirm={bulkDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}