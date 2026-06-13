'use client';

import { useState, useEffect } from 'react';
import { PLATFORMS, PLATFORM_LABELS } from '@/lib/constants';

interface SaleFormFieldsProps {
  soldPrice: string;
  setSoldPrice: (v: string) => void;
  platform: string;
  setPlatform: (v: string) => void;
  shippingCost: string;
  setShippingCost: (v: string) => void;
  shippingCollected: string;
  setShippingCollected: (v: string) => void;
  salesTax: string;
  setSalesTax: (v: string) => void;
  platformFees: string;
  setPlatformFees: (v: string) => void;
  soldDate: string;
  setSoldDate: (v: string) => void;
  taxRate?: number;
  showItemId?: boolean;
  itemId?: string;
  setItemId?: (v: string) => void;
}

export default function SaleFormFields({
  soldPrice, setSoldPrice,
  platform, setPlatform,
  shippingCost, setShippingCost,
  shippingCollected, setShippingCollected,
  salesTax, setSalesTax,
  platformFees, setPlatformFees,
  soldDate, setSoldDate,
  taxRate = 0.0825,
  showItemId = false,
  itemId, setItemId,
}: SaleFormFieldsProps) {
  const [autoCalculateTax, setAutoCalculateTax] = useState(false);

  useEffect(() => {
    if (autoCalculateTax && soldPrice) {
      const price = parseFloat(soldPrice);
      if (!isNaN(price)) {
        const tax = price - (price / (1 + taxRate));
        setSalesTax(tax.toFixed(2));
      }
    }
  }, [autoCalculateTax, soldPrice, taxRate, setSalesTax]);

  return (
    <div className="space-y-4">
      {showItemId && setItemId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item ID (optional)</label>
          <input
            type="number"
            value={itemId || ''}
            onChange={e => setItemId(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Link to an existing item"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sold Price *</label>
          <input
            type="number"
            step="0.01"
            value={soldPrice}
            onChange={e => setSoldPrice(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sale Date *</label>
          <input
            type="date"
            value={soldDate}
            onChange={e => setSoldDate(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Platform *</label>
        <select
          value={platform}
          onChange={e => setPlatform(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          required
        >
          {PLATFORMS.map(p => (
            <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shipping Cost</label>
          <input
            type="number"
            step="0.01"
            value={shippingCost}
            onChange={e => setShippingCost(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shipping Collected</label>
          <input
            type="number"
            step="0.01"
            value={shippingCollected}
            onChange={e => setShippingCollected(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sales Tax</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={salesTax}
              onChange={e => setSalesTax(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <label className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={autoCalculateTax}
              onChange={e => setAutoCalculateTax(e.target.checked)}
            />
            Auto-calculate from price
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Platform Fees</label>
          <input
            type="number"
            step="0.01"
            value={platformFees}
            onChange={e => setPlatformFees(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}