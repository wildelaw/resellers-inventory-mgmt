'use client';

import { PLATFORM_LABELS } from '@/lib/constants';
import type { Platform } from '@/lib/constants';

interface SaleFormFieldsProps {
  soldDate: string;
  soldPrice: string;
  shippingCost: string;
  shippingCollected: string;
  platform: Platform;
  salesTax: string;
  platformFees: string;
  onSoldDateChange: (v: string) => void;
  onSoldPriceChange: (v: string) => void;
  onShippingCostChange: (v: string) => void;
  onShippingCollectedChange: (v: string) => void;
  onPlatformChange: (v: Platform) => void;
  onSalesTaxChange: (v: string) => void;
  onPlatformFeesChange: (v: string) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function SaleFormFields({
  soldDate,
  soldPrice,
  shippingCost,
  shippingCollected,
  platform,
  salesTax,
  platformFees,
  onSoldDateChange,
  onSoldPriceChange,
  onShippingCostChange,
  onShippingCollectedChange,
  onPlatformChange,
  onSalesTaxChange,
  onPlatformFeesChange,
}: SaleFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Sale Date *</label>
          <input
            type="date"
            required
            value={soldDate}
            onChange={e => onSoldDateChange(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Platform *</label>
          <select
            required
            value={platform}
            onChange={e => onPlatformChange(e.target.value as Platform)}
            className={inputClass}
          >
            {(Object.entries(PLATFORM_LABELS) as [Platform, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Sold Price *</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={soldPrice}
            onChange={e => onSoldPriceChange(e.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelClass}>Sales Tax</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={salesTax}
            onChange={e => onSalesTaxChange(e.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Shipping Collected</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={shippingCollected}
            onChange={e => onShippingCollectedChange(e.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelClass}>Shipping Cost</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={shippingCost}
            onChange={e => onShippingCostChange(e.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Platform Fees</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={platformFees}
          onChange={e => onPlatformFeesChange(e.target.value)}
          className={inputClass}
          placeholder="0.00"
        />
      </div>
    </div>
  );
}
