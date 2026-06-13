'use client';

import { PLATFORMS, PLATFORM_LABELS } from '@/lib/constants';
import type { Platform } from '@/lib/constants';

interface SaleFormFieldsProps {
  formData: {
    soldDate: string;
    soldPrice: string;
    shippingCost: string;
    shippingCollected: string;
    platform: Platform | '';
    salesTax: string;
    platformFees: string;
  };
  onChange: (field: string, value: string) => void;
  showItemFields?: boolean;
  itemId?: number | null;
  onItemChange?: (value: string) => void;
  items?: { id: number; name: string }[];
}

export default function SaleFormFields({
  formData,
  onChange,
  showItemFields = true,
  itemId,
  onItemChange,
  items,
}: SaleFormFieldsProps) {
  return (
    <div className="space-y-4">
      {showItemFields && items && onItemChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Item
          </label>
          <select
            value={itemId || ''}
            onChange={(e) => onItemChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">No item linked</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sale Date *
        </label>
        <input
          type="date"
          value={formData.soldDate}
          onChange={(e) => onChange('soldDate', e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sold Price *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.soldPrice}
            onChange={(e) => onChange('soldPrice', e.target.value)}
            required
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Platform *
          </label>
          <select
            value={formData.platform}
            onChange={(e) => onChange('platform', e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select platform</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Shipping Cost
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.shippingCost}
            onChange={(e) => onChange('shippingCost', e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Shipping Collected
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.shippingCollected}
            onChange={(e) => onChange('shippingCollected', e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sales Tax
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.salesTax}
            onChange={(e) => onChange('salesTax', e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Platform Fees
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.platformFees}
            onChange={(e) => onChange('platformFees', e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}