'use client';

import { ALL_PLATFORMS, PLATFORM_LABELS, type SalePlatform } from '@/lib/constants';

interface SaleFormFieldsProps {
  soldDate: string;
  soldPrice: string;
  shippingCost: string;
  shippingCollected: string;
  platform: SalePlatform;
  salesTax: string;
  platformFees: string;
  autoTax: boolean;
  onChange: (field: string, value: string) => void;
  onAutoTaxChange: (value: boolean) => void;
}

export default function SaleFormFields({
  soldDate,
  soldPrice,
  shippingCost,
  shippingCollected,
  platform,
  salesTax,
  platformFees,
  autoTax,
  onChange,
  onAutoTaxChange,
}: SaleFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sale Date</label>
        <input
          type="date"
          value={soldDate}
          onChange={(e) => onChange('soldDate', e.target.value)}
          className="input-field"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sold Price *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={soldPrice}
          onChange={(e) => onChange('soldPrice', e.target.value)}
          className="input-field"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
        <select
          value={platform}
          onChange={(e) => onChange('platform', e.target.value)}
          className="input-field"
        >
          {ALL_PLATFORMS.map((p) => (
            <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shipping Cost</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={shippingCost}
          onChange={(e) => onChange('shippingCost', e.target.value)}
          className="input-field"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shipping Collected</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={shippingCollected}
          onChange={(e) => onChange('shippingCollected', e.target.value)}
          className="input-field"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sales Tax
          <label className="ml-2 inline-flex items-center text-xs">
            <input
              type="checkbox"
              checked={autoTax}
              onChange={(e) => onAutoTaxChange(e.target.checked)}
              className="mr-1"
            />
            Auto
          </label>
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={salesTax}
          onChange={(e) => onChange('salesTax', e.target.value)}
          className="input-field"
          disabled={autoTax}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform Fees</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={platformFees}
          onChange={(e) => onChange('platformFees', e.target.value)}
          className="input-field"
        />
      </div>
    </div>
  );
}