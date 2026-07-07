'use client';

import { ALL_PLATFORMS, PLATFORM_LABELS, type Platform } from '@/lib/constants';

interface SaleFormFieldsProps {
  formData: {
    soldPrice: string;
    shippingCost: string;
    shippingCollected: string;
    platform: Platform;
    salesTax: string;
    platformFees: string;
    soldDate: string;
  };
  updateField: (field: any, value: any) => void;
  onAutoTax?: () => void;
}

export default function SaleFormFields({ formData, updateField, onAutoTax }: SaleFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sale Date *
        </label>
        <input
          type="date"
          required
          value={formData.soldDate}
          onChange={(e) => updateField('soldDate', e.target.value)}
          className="input-field"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sold Price *
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          value={formData.soldPrice}
          onChange={(e) => updateField('soldPrice', e.target.value)}
          onBlur={onAutoTax}
          placeholder="0.00"
          className="input-field"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Platform *
        </label>
        <select
          required
          value={formData.platform}
          onChange={(e) => updateField('platform', e.target.value)}
          className="input-field"
        >
          {ALL_PLATFORMS.map(p => (
            <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
          ))}
        </select>
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
            onChange={(e) => updateField('shippingCost', e.target.value)}
            placeholder="0.00"
            className="input-field"
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
            onChange={(e) => updateField('shippingCollected', e.target.value)}
            placeholder="0.00"
            className="input-field"
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
            onChange={(e) => updateField('salesTax', e.target.value)}
            placeholder="0.00"
            className="input-field"
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
            onChange={(e) => updateField('platformFees', e.target.value)}
            placeholder="0.00"
            className="input-field"
          />
        </div>
      </div>
    </div>
  );
}