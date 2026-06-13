'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/constants';
import type { ItemStatus } from '@/lib/constants';

interface Item { id: number; name: string; status: string; purchasePrice: number; category: string | null; purchaseDate: string | Date; photos: { id: number; filename: string; isPrimary: boolean }[]; }

export default function InventoryClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/inventory?${params}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory</h1>
        <Link href="/inventory/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">Add Item</Link>
      </div>
      <div className="flex space-x-4 mb-6">
        <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
        </select>
        <button onClick={fetchItems} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md">Search</button>
      </div>
      {loading ? (<p className="text-gray-500 dark:text-gray-400">Loading...</p>) : items.length === 0 ? (<p className="text-gray-500 dark:text-gray-400">No items found.</p>) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700"><tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4"><Link href={`/inventory/${item.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">{item.name}</Link></td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[item.status as ItemStatus] || 'bg-gray-100 text-gray-800'}`}>{STATUS_LABELS[item.status as ItemStatus] || item.status}</span></td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white">${Number(item.purchasePrice).toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{item.category || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}