'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmModal from '@/components/ConfirmModal';
import { formatCurrency, formatDate, formatDateTime, getPhotoUrl } from '@/lib/utils';
import { PLATFORM_LABELS } from '@/lib/constants';
import type { ItemStatus } from '@/lib/constants';

interface Item {
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
  metadata: string | null;
  ownerId: number;
  createdAt: number;
  updatedAt: number;
}

interface Sale {
  id: number;
  itemId: number | null;
  soldDate: number;
  soldPrice: number;
  shippingCost: number | null;
  shippingCollected: number | null;
  platform: string;
  salesTax: number | null;
  platformFees: number | null;
  refundAmount: number | null;
  refundType: string;
  soldBy: number;
  createdAt: number;
  profit: number;
}

interface Photo {
  id: number;
  itemId: number;
  filename: string;
  path: string;
  isPrimary: number;
  createdAt: number;
}

interface ItemDetailClientProps {
  item: Item;
  sales: Sale[];
  photos: Photo[];
  allowedTransitions: ItemStatus[];
  canEdit: boolean;
  statusLabels: Record<ItemStatus, string>;
  statusColors: Record<ItemStatus, string>;
}

export default function ItemDetailClient({
  item,
  sales,
  photos,
  allowedTransitions,
  canEdit,
  statusLabels,
  statusColors,
}: ItemDetailClientProps) {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const handleStatusChange = async (newStatus: ItemStatus) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/inventory/${item.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete item');
      }
      router.push('/inventory');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{item.name}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
              {statusLabels[item.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Added {formatDateTime(item.createdAt)} &middot; Updated {formatDateTime(item.updatedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Link
                href={`/inventory/${item.id}/edit`}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                Edit
              </Link>
              {item.status !== 'sold' && (
                <Link
                  href={`/sales/new?itemId=${item.id}`}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                  Record Sale
                </Link>
              )}
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photos */}
          {photos.length > 0 && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Photos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <img
                    key={photo.id}
                    src={getPhotoUrl(item.id, photo.filename)}
                    alt={photo.filename}
                    className="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Details Card */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {item.description && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{item.description}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Purchase Price</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatCurrency(item.purchasePrice)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Purchase Date</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(item.purchaseDate)}</dd>
              </div>
              {item.purchaseLocation && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Purchase Location</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{item.purchaseLocation}</dd>
                </div>
              )}
              {item.category && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{item.category}</dd>
                </div>
              )}
              {item.removalDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Removal Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(item.removalDate)}</dd>
                </div>
              )}
              {item.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{item.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Sales History */}
          {sales.length > 0 && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Sales History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Platform</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link href={`/sales/${sale.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                            {formatDate(sale.soldDate)}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formatCurrency(sale.soldPrice)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {PLATFORM_LABELS[sale.platform as keyof typeof PLATFORM_LABELS] || sale.platform}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(sale.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Transitions */}
          {canEdit && allowedTransitions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Status</h2>
              <div className="space-y-2">
                {allowedTransitions.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={statusUpdating}
                    className={`w-full text-left px-4 py-2 rounded-md text-sm font-medium transition-colors ${statusColors[status]} disabled:opacity-50`}
                  >
                    Mark as {statusLabels[status]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Item"
        message={`Are you sure you want to delete "${item.name}"? This will also delete all associated sales and photos. This action cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </main>
  );
}