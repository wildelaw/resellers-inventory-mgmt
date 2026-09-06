'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import { ALL_STATUSES, STATUS_LABELS, ALLOWED_TRANSITIONS } from '@/lib/constants';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';

export interface InventoryItem {
  id: number;
  name: string;
  description: string | null;
  purchaseDate: string;
  purchasePrice: number;
  purchaseLocation: string | null;
  category: string | null;
  status: keyof typeof STATUS_LABELS;
  removalDate: string | null;
  ownerId: number;
  photos: { id: number; itemId: number; filename: string; isPrimary: boolean }[];
}

interface Props {
  initialData: {
    items: InventoryItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
    categories: string[];
  };
  canDeleteOthers: boolean;
}

const inputClass =
  'px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm';

export default function InventoryClient({ initialData, canDeleteOthers }: Props) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<'list' | 'tiles'>('list');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState({ search: '', status: '', category: '', startDate: '', endDate: '', sortBy: 'createdAt', sortOrder: 'desc' });
  const [page, setPage] = useState(initialData.pagination.page);
  const [loading, setLoading] = useState(false);
  const [bulkStatusModal, setBulkStatusModal] = useState<{ open: boolean; status: string }>({ open: false, status: '' });
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(targetPage), sortBy: filters.sortBy, sortOrder: filters.sortOrder });
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      const res = await fetch(`/api/inventory?${params}`);
      if (!res.ok) {
        setError('Failed to load inventory');
        return;
      }
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Re-fetch when filters change (debounced for search)
  useEffect(() => {
    const initial = JSON.stringify(filters) === JSON.stringify({ search: '', status: '', category: '', startDate: '', endDate: '', sortBy: 'createdAt', sortOrder: 'desc' });
    if (initial && page === initialData.pagination.page) return;
    const t = setTimeout(() => fetchItems(page), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyBulkStatus = async () => {
    setBulkStatusModal({ open: false, status: '' });
    const res = await fetch('/api/inventory/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected], status: bulkStatusModal.status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Bulk update failed');
      return;
    }
    setSelected(new Set());
    fetchItems(page);
    router.refresh();
  };

  const applyBulkDelete = async () => {
    setBulkDeleteModal(false);
    const res = await fetch(`/api/inventory/bulk?ids=${[...selected].join(',')}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Bulk delete failed');
      return;
    }
    setSelected(new Set());
    fetchItems(page);
    router.refresh();
  };

  const { items, pagination } = data;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory</h1>
        <Link href="/inventory/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
          + Add Item
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md text-sm">{error}</div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
        <input
          type="search"
          placeholder="Search…"
          className={inputClass}
          value={filters.search}
          onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, search: e.target.value })); }}
        />
        <select className={inputClass} value={filters.status} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, status: e.target.value })); }}>
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select className={inputClass} value={filters.category} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, category: e.target.value })); }}>
          <option value="">All categories</option>
          {data.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" className={inputClass} value={filters.startDate} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, startDate: e.target.value })); }} />
        <input type="date" className={inputClass} value={filters.endDate} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, endDate: e.target.value })); }} />
        <select className={inputClass} value={`${filters.sortBy}:${filters.sortOrder}`} onChange={(e) => { const [sortBy, sortOrder] = e.target.value.split(':'); setFilters((f) => ({ ...f, sortBy, sortOrder })); }}>
          <option value="createdAt:desc">Newest first</option>
          <option value="createdAt:asc">Oldest first</option>
          <option value="purchaseDate:desc">Purchase date ↓</option>
          <option value="purchaseDate:asc">Purchase date ↑</option>
          <option value="purchasePrice:desc">Price ↓</option>
          <option value="purchasePrice:asc">Price ↑</option>
          <option value="name:asc">Name A–Z</option>
        </select>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-700 dark:text-gray-300">{selected.size} selected</span>
          <select
            className={inputClass}
            defaultValue=""
            onChange={(e) => { if (e.target.value) setBulkStatusModal({ open: true, status: e.target.value }); e.target.value = ''; }}
          >
            <option value="">Change status to…</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button onClick={() => setBulkDeleteModal(true)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm">
            Delete Selected
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            Clear
          </button>
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex space-x-1">
          <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded text-sm ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>List</button>
          <button onClick={() => setView('tiles')} className={`px-3 py-1.5 rounded text-sm ${view === 'tiles' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Tiles</button>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{pagination.total} items</span>
      </div>

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Loading…</p>}

      {items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No inventory items found.</p>
          <Link href="/inventory/new" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">Add your first item</Link>
        </div>
      ) : view === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === items.length && items.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Purchase Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Purchased</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/inventory/${item.id}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600">
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.category ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.purchasePrice)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(item.purchaseDate)}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden relative">
              <input
                type="checkbox"
                className="absolute top-2 left-2 z-10"
                checked={selected.has(item.id)}
                onChange={() => toggleSelect(item.id)}
              />
              <Link href={`/inventory/${item.id}`}>
                {item.photos.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getPhotoUrl(item.photos[0])} alt={item.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">No photo</div>
                )}
              </Link>
              <div className="p-3">
                <Link href={`/inventory/${item.id}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 line-clamp-1">
                  {item.name}
                </Link>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.purchasePrice)}</p>
                <div className="mt-2"><StatusBadge status={item.status} /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.page <= 1}
            className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 text-sm disabled:opacity-50">Previous</button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {pagination.page} of {pagination.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 text-sm disabled:opacity-50">Next</button>
        </div>
      )}

      <ConfirmModal
        isOpen={bulkStatusModal.open}
        title="Update Status"
        message={`Change ${selected.size} item(s) to "${STATUS_LABELS[bulkStatusModal.status as keyof typeof STATUS_LABELS] ?? bulkStatusModal.status}"? Donated and discarded items get a removal date — no sale record is created.`}
        confirmLabel="Update"
        confirmClass="bg-blue-600 hover:bg-blue-700 text-white"
        onConfirm={applyBulkStatus}
        onCancel={() => setBulkStatusModal({ open: false, status: '' })}
      />
      <ConfirmModal
        isOpen={bulkDeleteModal}
        title="Delete Items"
        message={`Permanently delete ${selected.size} item(s) and all related sales and photos? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={applyBulkDelete}
        onCancel={() => setBulkDeleteModal(false)}
      />
    </div>
  );
}