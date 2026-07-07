'use client';
import { ALL_PLATFORMS, PLATFORM_LABELS } from '@/lib/constants';

interface SaleFormFieldsProps {
  form: {
    soldPrice: string;
    shippingCost: string;
    shippingCollected: string;
    platform: string;
    salesTax: string;
    platformFees: string;
  };
  setField: (field: string, value: string) => void;
  autoTax: boolean;
  setAutoTax: (v: boolean) => void;
  netRevenue: number;
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function SaleFormFields({ form, setField, autoTax, setAutoTax, netRevenue }: SaleFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Sold Price *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={form.soldPrice}
          onChange={(e) => setField('soldPrice', e.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className={labelClass}>Platform *</label>
        <select
          value={form.platform}
          onChange={(e) => setField('platform', e.target.value)}
          className={inputClass}
        >
          {ALL_PLATFORMS.map((p) => (
            <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Shipping Cost</label>
          <input
            type="number"
            step="0.01"
            value={form.shippingCost}
            onChange={(e) => setField('shippingCost', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Shipping Collected</label>
          <input
            type="number"
            step="0.01"
            value={form.shippingCollected}
            onChange={(e) => setField('shippingCollected', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Sales Tax</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            value={form.salesTax}
            onChange={(e) => { setAutoTax(false); setField('salesTax', e.target.value); }}
            className={inputClass}
          />
          <label className="text-xs text-gray-500 whitespace-nowrap">
            <input
              type="checkbox"
              checked={autoTax}
              onChange={(e) => setAutoTax(e.target.checked)}
              className="mr-1"
            />
            Auto
          </label>
        </div>
      </div>
      <div>
        <label className={labelClass}>Platform Fees</label>
        <input
          type="number"
          step="0.01"
          value={form.platformFees}
          onChange={(e) => setField('platformFees', e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
        Net Revenue: <span className="font-semibold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(netRevenue)}</span>
      </div>
    </div>
  );
}
