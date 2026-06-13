'use client';

import { useState } from 'react';
import Link from 'next/link';
import { STATUS_LABELS, STATUS_COLORS, getAllowedTransitions } from '@/lib/constants';
import type { ItemStatus } from '@/lib/constants';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';
import ConfirmModal from '@/components/ConfirmModal';

interface Props { item: any; }

export default function ItemDetailClient({ item }: Props) {
  const [status, setStatus] = useState(item.status);
  const [showDelete, setShowDelete] = useState(false);
  const allowed = getAllowedTransitions(status as ItemStatus);

  const changeStatus = async (newStatus: string) => {
    await fetch(`/api/inventory/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatus(newStatus);
  };

  const deleteItem = async () => {
    await fetch(`/api/inventory/${item.id}`, { method: 'DELETE' });
    window.location.href = '/inventory';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{item.name}</h1>
        <div className="flex space-x-2">
          <Link href={`/inventory/${item.id}/edit`} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white">Edit</Link>
          <button onClick={() => setShowDelete(true)} className="px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white">Delete</button>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</span><p><span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[status as ItemStatus]}`}>{STATUS_LABELS[status as ItemStatus]}</span></p></div>
          <div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Purchase Price</span><p className="text-gray-900 dark:text-white font-semibold">{formatCurrency(item.purchasePrice)}</p></div>
          <div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Purchase Date</span><p className="text-gray-900 dark:text-white">{formatDate(item.purchaseDate)}</p></div>
          <div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</span><p className="text-gray-900 dark:text-white">{item.category || '-'}</p></div>
          <div><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Purchase Location</span><p className="text-gray-900 dark:text-white">{item.purchaseLocation || '-'}</p></div>
          {item.description && <div className="col-span-2"><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</span><p className="text-gray-900 dark:text-white">{item.description}</p></div>}
          {item.notes && <div className="col-span-2"><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</span><p className="text-gray-900 dark:text-white">{item.notes}</p></div>}
        </div>
        {allowed.length > 0 && (
          <div className="border-t dark:border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Change Status</h3>
            <div className="flex flex-wrap gap-2">
              {allowed.map(s => (
                <button key={s} onClick={() => changeStatus(s)} className={`px-3 py-1 rounded text-sm font-medium ${STATUS_COLORS[s as ItemStatus]} transition-colors hover:opacity-80`}>{STATUS_LABELS[s as ItemStatus]}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <ConfirmModal isOpen={showDelete} title="Delete Item" message="Are you sure you want to delete this item? This action cannot be undone." confirmLabel="Delete" variant="danger" onConfirm={deleteItem} onCancel={() => setShowDelete(false)} />
    </div>
  );
}