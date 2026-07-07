'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ALL_STATUSES, STATUS_LABELS, STATUS_COLORS } from '@/lib/constants';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';
import ConfirmModal from '@/components/ConfirmModal';

interface InventoryClientProps {
  initialItems: any[];
  initialTotal: number;
  canViewAll: boolean;
}

export default function InventoryClient({ initialItems, initialTotal, canViewAll }: InventoryClientProps) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkStatus, setShowBulkStatus] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const router = useRouter();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);

    const res = await fetch(`/api/inventory?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
    }
    setLoading(false);
  }, [search, statusFilter, categoryFilter, sortBy, sortOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/inventory/${deleteId}`, { method: 'DELETE' });
      setItems(items.filter(i => i.id !== deleteId));
      setShowDeleteConfirm(false);
      setDeleteId(null);
    } catch {
      alert('Failed to delete item');
    }
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    try {
      await fetch('/api/inventory/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status: bulkStatus }),
      });
      setShowBulkStatus(false);
      setSelectedIds([]);
      setBulkStatus('');
      fetchItems();
    } catch {
      alert('Failed to update items');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await fetch(`/api/inventory/bulk?ids=${selectedIds.join(',')}`, { method: 'DELETE' });
      setSelectedIds([]);
      fetchItems();
    } catch {
      alert('Failed to delete items');
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <Link href="/inventory/new" className="btn-primary">Add Item</Link>
        </div>

        {/* Filters */}
        <form onSubmit={handleSearch} className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
              <option value="">All Statuses</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <input
              type="text"
              placeholder="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field"
            />
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Bulk actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">{selectedIds.length} selected</span>
            <button onClick={() => setShowBulkStatus(true)} className="btn-secondary text-sm">Update Status</button>
            <button onClick={handleBulkDelete} className="btn-danger text-sm">Delete Selected</button>
            <button onClick={() => setSelectedIds([])} className="text-sm text-gray-500">Clear</button>
          </div>
        )}

        {/* Items table */}
        <div className="card overflow-x-auto">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No items found. Add your first inventory item to get started.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-2">
                    <input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? items.map(i => i.id) : [])} className="rounded" />
                  </th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Item</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Category</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Price</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Date</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="py-2 px-2">
                      <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="rounded" />
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center space-x-2">
                        {item.photos?.[0] && (
                          <img src={getPhotoUrl(item.id, item.photos[0].filename)} alt={item.name} className="w-10 h-10 rounded object-cover" />
                        )}
                        <Link href={`/inventory/${item.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          {item.name}
                        </Link>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-300">{item.category || '-'}</td>
                    <td className="py-2 px-2">
                      <span className={`status-badge ${STATUS_COLORS[item.status as keyof typeof STATUS_COLORS]}`}>
                        {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS]}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-sm text-gray-600 dark:text-gray-300">{formatCurrency(item.purchasePrice)}</td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-300">{formatDate(item.purchaseDate)}</td>
                    <td className="py-2 px-2 text-right">
                      <Link href={`/inventory/${item.id}/edit`} className="text-blue-600 dark:text-blue-400 text-sm hover:underline mr-3">Edit</Link>
                      <button
                        onClick={() => { setDeleteId(item.id); setShowDeleteConfirm(true); }}
                        className="text-red-500 text-sm hover:underline"
                      >Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bulk status modal */}
        {showBulkStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Update Status for {selectedIds.length} items</h2>
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="input-field mb-4">
                <option value="">Select status...</option>
                {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setShowBulkStatus(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleBulkStatus} disabled={!bulkStatus} className="btn-primary">Update</button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          open={showDeleteConfirm}
          title="Delete Item"
          message="Are you sure you want to delete this item? This will also delete associated photos and sales."
          confirmText="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteConfirm(false); setDeleteId(null); }}
        />
    </div>
  );
}