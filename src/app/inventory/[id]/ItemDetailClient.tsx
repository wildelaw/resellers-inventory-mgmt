'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STATUS_LABELS, STATUS_COLORS, getAllowedTransitions } from '@/lib/constants';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';
import SalesEntryModal from '@/components/SalesEntryModal';
import ConfirmModal from '@/components/ConfirmModal';

export default function ItemDetailClient({ item, canEdit }: { item: any; canEdit: boolean }) {
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const router = useRouter();

  const allowedTransitions = getAllowedTransitions(item.status);

  const handleStatusChange = async () => {
    if (!statusUpdate) return;
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusUpdate }),
      });
      if (res.ok) {
        router.refresh();
      }
      setShowStatusUpdate(false);
      setStatusUpdate('');
    } catch {
      alert('Failed to update status');
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/inventory/${item.id}`, { method: 'DELETE' });
      router.push('/inventory');
    } catch {
      alert('Failed to delete item');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/inventory" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block">← Back to Inventory</Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{item.name}</h1>
          <span className={`status-badge ${STATUS_COLORS[item.status as keyof typeof STATUS_COLORS]} mt-2 inline-block`}>
            {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS]}
          </span>
        </div>
        {canEdit && (
          <div className="flex space-x-2">
            <Link href={`/inventory/${item.id}/edit`} className="btn-secondary">Edit</Link>
            <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger">Delete</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Photos */}
        <div className="md:col-span-1">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Photos</h2>
            {item.photos && item.photos.length > 0 ? (
              <div className="space-y-2">
                {item.photos.map((photo: any) => (
                  <img key={photo.id} src={getPhotoUrl(item.id, photo.filename)} alt={item.name} className="w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No photos uploaded.</p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Purchase Price</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{formatCurrency(item.purchasePrice)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Purchase Date</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{formatDate(item.purchaseDate)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Purchase Location</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{item.purchaseLocation || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Category</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{item.category || '-'}</dd>
              </div>
              {item.removalDate && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Removal Date</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">{formatDate(item.removalDate)}</dd>
                </div>
              )}
            </dl>

            {item.description && (
              <div className="mt-4">
                <dt className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</dt>
                <dd className="text-gray-900 dark:text-white">{item.description}</dd>
              </div>
            )}

            {item.notes && (
              <div className="mt-4">
                <dt className="text-sm text-gray-500 dark:text-gray-400 mb-1">Notes</dt>
                <dd className="text-gray-900 dark:text-white">{item.notes}</dd>
              </div>
            )}
          </div>

          {/* Status Actions */}
          {canEdit && allowedTransitions.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Actions</h2>
              <div className="flex flex-wrap gap-2">
                {allowedTransitions.includes('sold') && (
                  <button onClick={() => setShowSaleModal(true)} className="btn-primary">Record Sale</button>
                )}
                <button onClick={() => setShowStatusUpdate(true)} className="btn-secondary">Change Status</button>
              </div>
            </div>
          )}

          {/* Sales History */}
          {item.sales && item.sales.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Sales History</h2>
              <div className="space-y-3">
                {item.sales.map((sale: any) => (
                  <div key={sale.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div>
                      <Link href={`/sales/${sale.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {formatCurrency(sale.soldPrice)} on {formatDate(sale.soldDate)}
                      </Link>
                      {sale.refundAmount > 0 && (
                        <span className="text-xs text-red-500 ml-2">Refunded: {formatCurrency(sale.refundAmount)}</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{sale.seller?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showStatusUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Change Status</h2>
            <select value={statusUpdate} onChange={(e) => setStatusUpdate(e.target.value)} className="input-field mb-4">
              <option value="">Select new status...</option>
              {allowedTransitions.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowStatusUpdate(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleStatusChange} disabled={!statusUpdate} className="btn-primary">Update</button>
            </div>
          </div>
        </div>
      )}

      <SalesEntryModal
        open={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        onSuccess={() => router.refresh()}
        itemId={item.id}
        itemName={item.name}
      />

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Item"
        message="Are you sure you want to delete this item? This will also delete associated photos and sales."
        confirmText="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}