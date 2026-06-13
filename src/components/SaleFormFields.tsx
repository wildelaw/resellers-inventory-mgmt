'use client';

import { PLATFORM_LABELS } from '@/lib/constants';

interface SaleFormFieldsProps {
  formData: Record<string, any>;
  updateField: (field: string, value: string) => void;
  showItemSelect?: boolean;
}

export default function SaleFormFields({ formData, updateField, showItemSelect = true }: SaleFormFieldsProps) {
  return (
    <div className="space-y-4">
      {showItemSelect && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item (optional)</label>
          <input
            type="number"
            value={formData.itemId || ''}
            onChange={e => updateField('itemId', e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Item ID"
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sale Date *</label>
        <input
          type="date"
          value={formData.soldDate}
          onChange={e => updateField('soldDate', e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sale Price *</label>
        <input
          type="number"
          step="0.01"
          value={formData.soldPrice}
          onChange={e => updateField('soldPrice', e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="0.00"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shipping Cost</label>
          <input
            type="number"
            step="0.01"
            value={formData.shippingCost}
            onChange={e => updateField('shippingCost', e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shipping Collected</label>
          <input
            type="number"
            step="0.01"
            value={formData.shippingCollected}
            onChange={e => updateField('shippingCollected', e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="0.00"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Platform *</label>
        <select
          value={formData.platform}
          onChange={e => updateField('platform', e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          required
        >
          {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sales Tax</label>
          <input
            type="number"
            step="0.01"
            value={formData.salesTax}
            onChange={e => updateField('salesTax', e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Platform Fees</label>
          <input
            type="number"
            step="0.01"
            value={formData.platformFees}
            onChange={e => updateField('platformFees', e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="0.00"
          />
        </div>
      </div>
    </div>
  );
}