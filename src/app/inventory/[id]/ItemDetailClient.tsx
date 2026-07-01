'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import ConfirmModal from '@/components/ConfirmModal';
import RefundEntryModal from '@/components/RefundEntryModal';
import SalesEntryModal from '@/components/SalesEntryModal';
import { STATUS_LABELS, STATUS_COLORS, getAllowedTransitions } from '@/lib/constants';
import type { ItemStatus } from '@/lib/constants';
import { formatCurrency, formatDate, getPhotoUrl } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';

interface Photo { id: number; filename: string; isPrimary: boolean; }
interface SaleRecord {
  id: number; soldDate: string | Date; soldPrice: number;
  shippingCost?: number | null; shippingCollected?: number | null;
  platform: string; salesTax?: number | null; platformFees?: number | null;
  refundAmount?: number | null; refundType: string; refundReason?: string | null;
  seller?: { id: number; name: string } | null;
}
interface ItemDetail {
  id: number; name: string; description?: string | null;
  purchaseDate: string | Date; purchasePrice: number;
  purchaseLocation?: string | null; category?: string | null;
  status: ItemStatus; notes?: string | null;
  removalDate?: string | Date | null;
  photos: Photo[];
  sales: SaleRecord[];
  owner?: { id: number; name: string; email: string } | null;
}

interface Props { item: ItemDetail; canEdit: boolean; }

export default function ItemDetailClient({ item, canEdit }: Props) {
  const router = useRouter();
  const [currentItem, setCurrentItem] = useState<ItemDetail>(item);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundSale, setRefundSale] = useState<SaleRecord | null>(null);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(
    item.photos.find(p => p.isPrimary) || item.photos[0] || null
  );
  const [uploading, setUploading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/inventory/${currentItem.id}`, { method: 'DELETE' });
      if (res.ok) router.push('/inventory');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`/api/inventory/${currentItem.id}/photo`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const fresh = await fetch(`/api/inventory/${currentItem.id}`);
        const data = await fresh.json();
        setCurrentItem(data);
        setSelectedPhoto(data.photos.find((p: Photo) => p.isPrimary) || data.photos[0] || null);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    const res = await fetch(`/api/inventory/${currentItem.id}/photo?photoId=${photoId}`, { method: 'DELETE' });
    if (res.ok) {
      const fresh = await fetch(`/api/inventory/${currentItem.id}`);
      const data = await fresh.json();
      setCurrentItem(data);
      setSelectedPhoto(data.photos.find((p: Photo) => p.isPrimary) || data.photos[0] || null);
    }
  };

  const refreshItem = async () => {
    const res = await fetch(`/api/inventory/${currentItem.id}`);
    const data = await res.json();
    setCurrentItem(data);
  };

  const allowedTransitions = getAllowedTransitions(currentItem.status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <Link href="/inventory" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
            ← Back to Inventory
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Photos column */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {selectedPhoto ? (
                <img
                  src={getPhotoUrl(currentItem.id, selectedPhoto.filename)}
                  alt={currentItem.name}
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-400">No photo</span>
                </div>
              )}

              {currentItem.photos.length > 1 && (
                <div className="flex gap-2 p-2 flex-wrap">
                  {currentItem.photos.map(photo => (
                    <button key={photo.id} onClick={() => setSelectedPhoto(photo)}
                      className={`relative ${selectedPhoto?.id === photo.id ? 'ring-2 ring-blue-500' : ''}`}>
                      <img src={getPhotoUrl(currentItem.id, photo.filename)} alt=""
                        className="w-12 h-12 object-cover rounded" />
                      {canEdit && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center"
                        >×</button>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {canEdit && (
                <div className="p-3 border-t dark:border-gray-700">
                  <label className="cursor-pointer block">
                    <span className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                      {uploading ? 'Uploading...' : '+ Add Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Details column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{currentItem.name}</h1>
                  {currentItem.category && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentItem.category}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded text-sm font-medium capitalize ${STATUS_COLORS[currentItem.status]}`}>
                  {STATUS_LABELS[currentItem.status]}
                </span>
              </div>

              {currentItem.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{currentItem.description}</p>
              )}

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Purchase Price</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{formatCurrency(currentItem.purchasePrice)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Purchase Date</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{formatDate(currentItem.purchaseDate)}</dd>
                </div>
                {currentItem.purchaseLocation && (
                  <div className="col-span-2">
                    <dt className="text-gray-500 dark:text-gray-400">Purchase Location</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">{currentItem.purchaseLocation}</dd>
                  </div>
                )}
                {currentItem.owner && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Owner</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">{currentItem.owner.name}</dd>
                  </div>
                )}
                {currentItem.removalDate && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Removal Date</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">{formatDate(currentItem.removalDate)}</dd>
                  </div>
                )}
              </dl>

              {currentItem.notes && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{currentItem.notes}</p>
                </div>
              )}

              {canEdit && (
                <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t dark:border-gray-700">
                  <Link href={`/inventory/${currentItem.id}/edit`}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
                    Edit
                  </Link>
                  {allowedTransitions.includes('sold' as ItemStatus) && (
                    <button
                      onClick={() => setSaleModalOpen(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                    >
                      Record Sale
                    </button>
                  )}
                  <button onClick={() => setDeleteOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors">
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Sales */}
            {currentItem.sales.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Sales History</h2>
                <div className="space-y-4">
                  {currentItem.sales.map(sale => {
                    const profit = calculateProfit({
                      soldPrice: sale.soldPrice,
                      shippingCollected: sale.shippingCollected,
                      salesTax: sale.salesTax,
                      platformFees: sale.platformFees,
                      refundAmount: sale.refundAmount,
                      purchasePrice: currentItem.purchasePrice,
                      shippingCost: sale.shippingCost,
                    });
                    return (
                      <div key={sale.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(sale.soldPrice)} on {formatDate(sale.soldDate)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{sale.platform}</p>
                            {sale.refundAmount && sale.refundAmount > 0 && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                Refund: {formatCurrency(sale.refundAmount)} — {sale.refundReason}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(profit)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">profit</p>
                          </div>
                        </div>
                        {sale.refundType === 'none' && canEdit && (
                          <button
                            onClick={() => { setRefundSale(sale); setRefundOpen(true); }}
                            className="mt-2 text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400"
                          >
                            Process Refund
                          </button>
                        )}
                        <Link href={`/sales/${sale.id}`} className="mt-1 block text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
                          View Sale →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Item"
        message={`Are you sure you want to delete "${currentItem.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteLoading}
      />

      {refundSale && (
        <RefundEntryModal
          isOpen={refundOpen}
          onClose={() => { setRefundOpen(false); setRefundSale(null); }}
          onSuccess={refreshItem}
          saleId={refundSale.id}
          soldPrice={refundSale.soldPrice}
        />
      )}

      <SalesEntryModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        onSuccess={() => { setSaleModalOpen(false); refreshItem(); }}
        preSelectedItemId={currentItem.id}
        items={[{ id: currentItem.id, name: currentItem.name, purchasePrice: currentItem.purchasePrice, status: currentItem.status }]}
      />
    </div>
  );
}
