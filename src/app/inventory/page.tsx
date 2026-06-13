'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import ConfirmModal from '@/components/ConfirmModal';
import { STATUS_LABELS, STATUS_COLORS, ALL_STATUSES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function InventoryPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', category: '', search: '', page: 1 });

  useEffect(() => {
    if (!session) return;
    fetchItems();
  }, [session, filter]);

  const fetchItems = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.category) params.set('category', filter.category);
    if (filter.search) params.set('search', filter.search);
    params.set('page', String(filter.page));

    const res = await fetch(`/api/inventory?${params}`);
    const data = await res.json();
    setItems(data.items || []);
    setPagination(data.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 });
    setCategories(data.categories || []);
    setLoading(false);
  };

  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    fetchItems();
    setShowDeleteModal(false);
  };

  const handleBulkStatusChange = async (status: string) => {
    if (selectedItems.length === 0) return;
    await fetch('/api/inventory/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedItems, status }),
    });
    setSelectedItems([]);
    fetchItems();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <a href="/inventory/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">Add Item</a>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
          <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value, page: 1 }))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white">
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value, page: 1 }))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="text" placeholder="Search..." value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value, page: 1 }))} className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" />

          {selectedItems.length > 0 && (
            <div className="flex gap-2">
              <select onChange={e => e.target.value && handleBulkStatusChange(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm">
                <option value="">Bulk Status Change</option>
                {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Items Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">No items found. Add your first item!</div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left"><input type="checkbox" onChange={e => setSelectedItems(e.target.checked ? items.map((i: any) => i.id) : [])} checked={selectedItems.length === items.length && items.length > 0} /></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Purchase Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Purchase Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedItems.includes(item.id)} onChange={e => setSelectedItems(prev => e.target.checked ? [...prev, item.id] : prev.filter(id => id !== item.id))} /></td>
                    <td className="px-4 py-3"><a href={`/inventory/${item.id}`} className="text-blue-600 hover:underline">{item.name}</a></td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`}>{STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.category || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatCurrency(item.purchasePrice)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(item.purchaseDate)}</td>
                    <td className="px-4 py-3 text-sm">
                      <a href={`/inventory/${item.id}/edit`} className="text-blue-600 hover:underline mr-3">Edit</a>
                      <button onClick={() => { setDeleteId(item.id); setShowDeleteModal(true); }} className="text-red-500 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))} disabled={pagination.page <= 1} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-600 dark:text-gray-400">Page {pagination.page} of {pagination.totalPages}</span>
            <button onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))} disabled={pagination.page >= pagination.totalPages} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md disabled:opacity-50">Next</button>
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Item"
        message="Are you sure you want to delete this item? This will also delete all associated photos and sales."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}