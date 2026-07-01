'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/header';
import ConfirmModal from '@/components/ConfirmModal';
import { STATUS_LABELS, STATUS_COLORS, ALL_STATUSES, getAllowedTransitions } from '@/lib/constants';
import type { ItemStatus } from '@/lib/constants';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';

interface Photo {
  id: number;
  filename: string;
  isPrimary: boolean;
}

interface Sale {
  id: number;
  soldPrice: number;
}

interface Item {
  id: number;
  name: string;
  description?: string | null;
  purchaseDate: string | Date;
  purchasePrice: number;
  purchaseLocation?: string | null;
  category?: string | null;
  status: ItemStatus;
  notes?: string | null;
  removalDate?: string | Date | null;
  photos: Photo[];
  sales: Sale[];
  owner?: { id: number; name: string; email: string } | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface InventoryClientProps {
  initialItems: Item[];
  initialPagination: Pagination;
  initialCategories: string[];
  canViewAll: boolean;
}

export default function InventoryClient({
  initialItems,
  initialPagination,
  initialCategories,
  canViewAll,
}: InventoryClientProps) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [categories] = useState<string[]>(initialCategories);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('tile');
  const [page, setPage] = useState(1);

  // Bulk select
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ItemStatus>('available');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchItems = useCallback(async (params: Record<string, string>) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`/api/inventory?${qs}`);
      const data = await res.json();
      setItems(data.items || []);
      setPagination(data.pagination || initialPagination);
    } catch { /* swallow */ } finally {
      setLoading(false);
    }
  }, [initialPagination]);

  const applyFilters = (newPage = 1) => {
    setPage(newPage);
    setSelected(new Set());
    const params: Record<string, string> = {
      page: String(newPage),
      pageSize: '20',
      sortBy,
      sortOrder,
    };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    fetchItems(params);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.id)));
    }
  };

  const handleBulkStatusChange = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/inventory/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), status: bulkStatus }),
      });
      if (res.ok) {
        setBulkStatusOpen(false);
        setSelected(new Set());
        applyFilters(page);
      }
    } catch { /* swallow */ } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/inventory/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (res.ok) {
        setBulkDeleteOpen(false);
        setSelected(new Set());
        applyFilters(page);
      }
    } catch { /* swallow */ } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItemId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inventory/${deleteItemId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteItemId(null);
        applyFilters(page);
      }
    } catch { /* swallow */ } finally {
      setActionLoading(false);
    }
  };

  const primaryPhoto = (item: Item) => item.photos.find(p => p.isPrimary) || item.photos[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <Link
            href="/inventory/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            + Add Item
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
            />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); applyFilters(); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Statuses</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); applyFilters(); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={e => {
                  const [field, order] = e.target.value.split(':');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                  applyFilters();
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="createdAt:desc">Newest</option>
                <option value="createdAt:asc">Oldest</option>
                <option value="name:asc">Name A-Z</option>
                <option value="purchasePrice:desc">Price High-Low</option>
                <option value="purchasePrice:asc">Price Low-High</option>
              </select>
              <button
                onClick={() => setViewMode(viewMode === 'tile' ? 'list' : 'tile')}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white"
                title={viewMode === 'tile' ? 'Switch to list view' : 'Switch to tile view'}
              >
                {viewMode === 'tile' ? '☰' : '⊞'}
              </button>
            </div>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 flex items-center gap-4">
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {selected.size} item{selected.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <select
                value={bulkStatus}
                onChange={e => setBulkStatus(e.target.value as ItemStatus)}
                className="px-2 py-1 text-sm border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-700 dark:text-white"
              >
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <button
                onClick={() => setBulkStatusOpen(true)}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Update Status
              </button>
            </div>
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            >
              Delete Selected
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Clear
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No items found.</p>
            <Link href="/inventory/new" className="mt-4 inline-block text-blue-600 hover:text-blue-700 text-sm">
              Add your first item →
            </Link>
          </div>
        ) : viewMode === 'tile' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="col-span-full flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={selected.size === items.length && items.length > 0}
                onChange={selectAll}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">Select all</span>
            </div>
            {items.map(item => {
              const photo = primaryPhoto(item);
              return (
                <div key={item.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col ${selected.has(item.id) ? 'ring-2 ring-blue-500' : ''}`}>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="absolute top-2 left-2 z-10 h-4 w-4 text-blue-600 border-gray-300 rounded bg-white"
                      onClick={e => e.stopPropagation()}
                    />
                    <Link href={`/inventory/${item.id}`}>
                      {photo ? (
                        <img
                          src={getPhotoUrl(item.id, photo.filename)}
                          alt={item.name}
                          className="w-full h-40 object-cover"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-400 text-sm">No photo</span>
                        </div>
                      )}
                    </Link>
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <Link href={`/inventory/${item.id}`} className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-sm truncate">
                      {item.name}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.category || '—'}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[item.status]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(item.purchasePrice)}
                      </span>
                    </div>
                    {canViewAll && item.owner && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{item.owner.name}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Link href={`/inventory/${item.id}/edit`}
                        className="flex-1 text-center text-xs py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 transition-colors">
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeleteItemId(item.id)}
                        className="flex-1 text-xs py-1 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-red-600 dark:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === items.length && items.length > 0}
                      onChange={selectAll}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Purchase Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map(item => (
                  <tr key={item.id} className={selected.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/inventory/${item.id}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                        {item.name}
                      </Link>
                      {canViewAll && item.owner && <p className="text-xs text-gray-400">{item.owner.name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[item.status]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.category || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(item.purchaseDate)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">{formatCurrency(item.purchasePrice)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/inventory/${item.id}/edit`}
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">Edit</Link>
                        <button onClick={() => setDeleteItemId(item.id)}
                          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => applyFilters(page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 text-gray-700 dark:text-gray-300"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} items)
            </span>
            <button
              onClick={() => applyFilters(page + 1)}
              disabled={page >= pagination.totalPages}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 text-gray-700 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={deleteItemId !== null}
        onClose={() => setDeleteItemId(null)}
        onConfirm={handleDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item? This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={actionLoading}
      />

      <ConfirmModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Items"
        message={`Are you sure you want to delete ${selected.size} item(s)? This cannot be undone.`}
        confirmLabel="Delete All"
        danger
        loading={actionLoading}
      />

      <ConfirmModal
        isOpen={bulkStatusOpen}
        onClose={() => setBulkStatusOpen(false)}
        onConfirm={handleBulkStatusChange}
        title="Update Status"
        message={`Change ${selected.size} item(s) to "${STATUS_LABELS[bulkStatus]}"?`}
        confirmLabel="Update"
        loading={actionLoading}
      />
    </div>
  );
}
