'use client';

import { useState } from 'react';
import SaleFormFields from './SaleFormFields';
import { PLATFORMS } from '@/lib/constants';

interface SalesEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  itemId?: number;
  initialData?: Record<string, unknown>;
}

export default function SalesEntryModal({ isOpen, onClose, onSubmit, itemId, initialData }: SalesEntryModalProps) {
  const [soldPrice, setSoldPrice] = useState(String(initialData?.soldPrice ?? ''));
  const [platform, setPlatform] = useState(String(initialData?.platform ?? 'local'));
  const [shippingCost, setShippingCost] = useState(String(initialData?.shippingCost ?? ''));
  const [shippingCollected, setShippingCollected] = useState(String(initialData?.shippingCollected ?? ''));
  const [salesTax, setSalesTax] = useState(String(initialData?.salesTax ?? ''));
  const [platformFees, setPlatformFees] = useState(String(initialData?.platformFees ?? ''));
  const [soldDate, setSoldDate] = useState(String(initialData?.soldDate ?? new Date().toISOString().split('T')[0]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onSubmit({
        itemId: itemId || undefined,
        soldPrice: parseFloat(soldPrice),
        platform,
        shippingCost: shippingCost ? parseFloat(shippingCost) : null,
        shippingCollected: shippingCollected ? parseFloat(shippingCollected) : 0,
        salesTax: salesTax ? parseFloat(salesTax) : null,
        platformFees: platformFees ? parseFloat(platformFees) : 0,
        soldDate: Math.floor(new Date(soldDate).getTime() / 1000),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {initialData ? 'Edit Sale' : 'Record Sale'}
        </h3>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <SaleFormFields
            soldPrice={soldPrice} setSoldPrice={setSoldPrice}
            platform={platform} setPlatform={setPlatform}
            shippingCost={shippingCost} setShippingCost={setShippingCost}
            shippingCollected={shippingCollected} setShippingCollected={setShippingCollected}
            salesTax={salesTax} setSalesTax={setSalesTax}
            platformFees={platformFees} setPlatformFees={setPlatformFees}
            soldDate={soldDate} setSoldDate={setSoldDate}
          />
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {loading ? 'Saving...' : initialData ? 'Update Sale' : 'Record Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}