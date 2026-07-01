'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ALL_STATUSES, STATUS_LABELS, STATUS_COLORS, type ItemStatus } from '@/lib/constants';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';
import ConfirmModal from '@/components/ConfirmModal';

interface Photo {
  id: number;
  filename: string;
  isPrimary: number;
}

interface Item {
  id: number;
  name: string;
  description: string | null;
  purchaseDate: number;
  purchasePrice: number;
  purchaseLocation: string | null;
  category: string | null;
  status: string;
  notes: string | null;
  ownerId: number;
  photos: Photo[];
}

interface InventoryClientProps {
  initialItems: Item[];
  initialPagination: { page: number; pageSize: number; total: number; totalPages: number };
  categories: string[];
}

export default function InventoryClient({ initialItems, initialPagination, categories }: InventoryClientProps) {
  const [items] = useState(initialItems);
  const [pagination] = useState(initialPagination);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ItemStatus>('donated');
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const router = useRouter();

  const filtered = items.filter((item) => {
    if (filterStatus && item.status !== filterStatus) return false;
    if (filterCategory && item.category !== filterCategory) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleBulkStatus = async () => {
    try {
      const res = await fetch('/api/inventory/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status: bulkStatus }),
      });
      if (res.ok) {
        setSelectedIds([]);
        router.refresh();
      }
    } catch { /* ignore */ }
  };

  const handleBulkDelete = async () => {
    try {
      const res = await fetch(`/api/inventory/bulk?ids=${selectedIds.join(',')}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedIds([]);
        setShowBulkDelete(false);
        router.refresh();
      }
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field flex-1"
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field sm:w-40">
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input-field sm:w-40">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded flex flex-wrap items-center gap-2">
          <span className="text-sm">{selectedIds.length} selected</span>
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as ItemStatus)} className="input-field w-40">
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button onClick={handleBulkStatus} className="btn-primary text-sm">Update Status</button>
          <button onClick={() => setShowBulkDelete(true)} className="btn-danger text-sm">Delete Selected</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((item) => (
          <div key={item.id} className="card">
            <div className="flex items-start justify-between mb-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="mr-2"
                />
              </label>
              <span className={`status-badge ${STATUS_COLORS[item.status as ItemStatus]}`}>
                {STATUS_LABELS[item.status as ItemStatus]}
              </span>
            </div>
            <Link href={`/inventory/${item.id}`}>
              <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded mb-2 overflow-hidden">
                {item.photos?.[0] ? (
                  <img src={getPhotoUrl(item.id, item.photos[0].filename)} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">No photo</div>
                )}
              </div>
              <h3 className="font-semibold truncate">{item.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.purchasePrice)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(item.purchaseDate)}</p>
            </Link>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No items found. <Link href="/inventory/new" className="text-blue-600 hover:underline">Add your first item</Link>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => (
            <Link
              key={i}
              href={`/inventory?page=${i + 1}`}
              className={`px-3 py-1 rounded ${i + 1 === pagination.page ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              {i + 1}
            </Link>
          ))}
        </div>
      )}

      <ConfirmModal
        open={showBulkDelete}
        title="Delete Items"
        message={`Delete ${selectedIds.length} item(s)? This will also delete associated sales and photos.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />
    </div>
  );
}