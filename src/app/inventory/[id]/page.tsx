'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/header';
import ConfirmModal from '@/components/ConfirmModal';
import { STATUS_LABELS, STATUS_COLORS, getAllowedTransitions, type ItemStatus } from '@/lib/constants';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => { fetchItem(); }, []);

  const fetchItem = async () => {
    const res = await fetch(`/api/inventory/${params.id}`);
    if (!res.ok) { router.push('/inventory'); return; }
    const data = await res.json();
    setItem(data.item);
    setLoading(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusUpdating(true);
    await fetch(`/api/inventory/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchItem();
    setStatusUpdating(false);
  };

  const handleDelete = async () => {
    await fetch(`/api/inventory/${params.id}`, { method: 'DELETE' });
    router.push('/inventory');
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900"><Header /><div className="text-center py-12 text-gray-500">Loading...</div></div>;
  if (!item) return null;

  const allowed = getAllowedTransitions(item.status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{item.name}</h1>
          <div className="flex gap-2">
            <a href={`/inventory/${item.id}/edit`} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm">Edit</a>
            <button onClick={() => setShowDeleteModal(true)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm">Delete</button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[item.status as ItemStatus] || 'bg-gray-100 text-gray-800'}`}>
              {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS]}
            </span>
            {allowed.length > 0 && (
              <div className="flex gap-2">
                {allowed.map(status => (
                  <button key={status} onClick={() => handleStatusChange(status)} disabled={statusUpdating}
                    className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded">
                    → {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-sm text-gray-500">Purchase Price</dt><dd className="text-lg font-semibold">{formatCurrency(item.purchasePrice)}</dd></div>
            <div><dt className="text-sm text-gray-500">Purchase Date</dt><dd>{formatDate(item.purchaseDate)}</dd></div>
            {item.purchaseLocation && <div><dt className="text-sm text-gray-500">Location</dt><dd>{item.purchaseLocation}</dd></div>}
            {item.category && <div><dt className="text-sm text-gray-500">Category</dt><dd>{item.category}</dd></div>}
            {item.description && <div className="col-span-2"><dt className="text-sm text-gray-500">Description</dt><dd>{item.description}</dd></div>}
            {item.notes && <div className="col-span-2"><dt className="text-sm text-gray-500">Notes</dt><dd>{item.notes}</dd></div>}
            {item.removalDate && <div><dt className="text-sm text-gray-500">Removal Date</dt><dd>{formatDate(item.removalDate)}</dd></div>}
          </dl>
        </div>

        {item.photos && item.photos.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Photos</h2>
            <div className="grid grid-cols-3 gap-4">
              {item.photos.map((photo: any) => (
                <img key={photo.id} src={getPhotoUrl(item.id, photo.filename)} alt={photo.filename} className="w-full rounded" />
              ))}
            </div>
          </div>
        )}

        {item.sales && item.sales.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Sales</h2>
            {item.sales.map((sale: any) => (
              <div key={sale.id} className="border-b border-gray-200 dark:border-gray-700 py-3 last:border-0">
                <div className="flex justify-between">
                  <span>{formatDate(sale.soldDate)} — {formatCurrency(sale.soldPrice)}</span>
                  <a href={`/sales/${sale.id}`} className="text-blue-600 hover:underline text-sm">View</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ConfirmModal isOpen={showDeleteModal} title="Delete Item" message="Are you sure? This will also delete all photos and sales records." confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onCancel={() => setShowDeleteModal(false)} />
    </div>
  );
}