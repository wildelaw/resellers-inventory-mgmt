'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmModal from '@/components/ConfirmModal';
import SalesEntryModal from '@/components/SalesEntryModal';
import { getPhotoUrl } from '@/lib/utils';
import { getAllowedTransitions, STATUS_LABELS, type ItemStatus } from '@/lib/constants';

export interface ItemDetail {
  id: number;
  name: string;
  description: string | null;
  purchaseDate: string;
  purchasePrice: number;
  purchaseLocation: string | null;
  category: string | null;
  status: ItemStatus;
  notes: string | null;
  removalDate: string | null;
  ownerId: number;
  photos: { id: number; itemId: number; filename: string; isPrimary: boolean }[];
  sales: { id: number; soldPrice: number; soldDate: string; platform: string; refundAmount: number }[];
}

interface Props {
  item: ItemDetail;
  canEdit: boolean;
  canDelete: boolean;
}

export default function ItemActions({ item, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const transitions = getAllowedTransitions(item.status);

  const changeStatus = async (status: ItemStatus) => {
    setError('');
    const res = await fetch(`/api/inventory/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Status change failed');
      return;
    }
    router.refresh();
  };

  const handleDelete = async () => {
    setDeleteModal(false);
    const res = await fetch(`/api/inventory/${item.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Delete failed');
      return;
    }
    router.push('/inventory');
  };

  const handleUpload = async () => {
    setError('');
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/inventory/${item.id}/photo`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Photo upload failed');
      return;
    }
    if (fileRef.current) fileRef.current.value = '';
    router.refresh();
  };

  const handleDeletePhoto = async (photoId: number) => {
    setError('');
    const res = await fetch(`/api/inventory/${item.id}/photo?photoId=${photoId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Photo delete failed');
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md text-sm">{error}</div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>

        <div className="flex flex-wrap gap-2">
          {/* Sell */}
          {canEdit && (item.status === 'available' || item.status === 'listed') && (
            <button onClick={() => setSaleModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm">
              Record Sale
            </button>
          )}

          {/* Status transitions */}
          {canEdit &&
            transitions.map((to) => (
              <button
                key={to}
                onClick={() => changeStatus(to)}
                className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm"
              >
                Mark {STATUS_LABELS[to]}
              </button>
            ))}

          {/* Photo upload */}
          {canEdit && (
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
              >
                Upload Photo
              </button>
            </div>
          )}

          {/* Edit */}
          {canEdit && (
            <Link href={`/inventory/${item.id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
              Edit Item
            </Link>
          )}

          {/* Delete */}
          {canDelete && (
            <button onClick={() => setDeleteModal(true)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm">
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Photos</h2>
        {item.photos.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No photos uploaded.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {item.photos.map((photo) => (
              <div key={photo.id} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getPhotoUrl(photo)} alt={item.name} className="w-full h-32 object-cover rounded-md" />
                {photo.isPrimary && (
                  <span className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">Primary</span>
                )}
                {canEdit && (
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related sales */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Sales History</h2>
        {item.sales.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No sales recorded for this item.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {item.sales.map((sale) => (
              <li key={sale.id} className="py-2 flex justify-between">
                <Link href={`/sales/${sale.id}`} className="text-sm text-blue-600 hover:text-blue-700">
                  {new Date(sale.soldDate).toLocaleDateString()} — {sale.platform}
                </Link>
                <span className="text-sm text-gray-900 dark:text-white">
                  ${sale.soldPrice.toFixed(2)}
                  {sale.refundAmount > 0 && (
                    <span className="text-red-600 dark:text-red-400 ml-2">
                      −${sale.refundAmount.toFixed(2)} refund
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal}
        title="Delete Item"
        message={`Permanently delete "${item.name}" and all related sales and photos? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(false)}
      />

      <SalesEntryModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        fixedItemId={item.id}
      />
    </div>
  );
}