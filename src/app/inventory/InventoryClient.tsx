'use client';
import { useState } from 'react';
import Link from 'next/link';
import { STATUS_LABELS, STATUS_COLORS, ALL_STATUSES, type ItemStatus } from '@/lib/constants';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';
import ConfirmModal from '@/components/ConfirmModal';

interface Photo { id: number; itemId: number; filename: string; isPrimary: boolean; }
interface Item { id: number; name: string; description: string | null; purchaseDate: number; purchasePrice: number; purchaseLocation: string | null; category: string | null; status: ItemStatus; ownerId: number; photos: Photo[]; }

export default function InventoryClient({ initialItems, canViewAll }: { initialItems: Item[]; canViewAll: boolean }) {
  const [items, setItems] = useState(initialItems);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ItemStatus>('donated');
  const [showBulkStatus, setShowBulkStatus] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    const res = await fetch(`/api/inventory?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    if (res.ok) fetchItems();
  };

  const handleBulkStatus = async () => {
    const res = await fetch('/api/inventory/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selected, status: bulkStatus }),
    });
    if (res.ok) { setSelected([]); setShowBulkStatus(false); fetchItems(); }
  };

  const handleBulkDelete = async () => {
    const res = await fetch(`/api/inventory/bulk?ids=${selected.join(',')}`, { method: 'DELETE' });
    if (res.ok) { setSelected([]); setShowBulkDelete(false); fetchItems(); }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory</h1>
        <Link href="/inventory/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">Add Item</Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white">
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <button onClick={fetchItems} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">Filter</button>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md">
          <span className="text-sm text-blue-700 dark:text-blue-300">{selected.length} selected</span>
          <button onClick={() => setShowBulkStatus(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Bulk Status</button>
          <button onClick={() => setShowBulkDelete(true)} className="bg-red-500 text-white px-3 py-1 rounded text-sm">Bulk Delete</button>
          <button onClick={() => setSelected([])} className="text-sm text-gray-500">Clear</button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No items found. Click "Add Item" to create one.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const primaryPhoto = item.photos.find((p) => p.isPrimary) ?? item.photos[0];
            return (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)} className="mt-1" />
                  <Link href={`/inventory/${item.id}`} className="flex-1">
                    {primaryPhoto && (
                      <img src={getPhotoUrl(item.id, primaryPhoto.filename)} alt={item.name} className="w-full h-32 object-cover rounded-md mb-2" />
                    )}
                    <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.purchasePrice)} · {formatDate(item.purchaseDate)}</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal open={showBulkStatus} title="Bulk Status Update" message={`Update ${selected.length} items to ${bulkStatus}?`} confirmLabel="Update" onConfirm={handleBulkStatus} onCancel={() => setShowBulkStatus(false)}>
        <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as ItemStatus)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white mb-2">
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </ConfirmModal>
      <ConfirmModal open={showBulkDelete} title="Bulk Delete" message={`Delete ${selected.length} items? This cannot be undone.`} confirmLabel="Delete" onConfirm={handleBulkDelete} onCancel={() => setShowBulkDelete(false)} />
    </div>
  );
}
