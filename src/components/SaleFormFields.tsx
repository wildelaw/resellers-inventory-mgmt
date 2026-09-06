'use client';

import { PLATFORM_LABELS } from '@/lib/constants';
import type { SaleFormData } from '@/hooks/useSaleForm';

interface ItemOption {
  id: number;
  name: string;
  status: string;
}

interface SaleFormFieldsProps {
  form: SaleFormData;
  update: (field: keyof SaleFormData, value: string) => void;
  items: ItemOption[];
  itemLocked?: boolean;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function SaleFormFields({ form, update, items, itemLocked = false }: SaleFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="sale-item">Item</label>
        <select
          id="sale-item"
          className={inputClass}
          value={form.itemId}
          disabled={itemLocked}
          onChange={(e) => update('itemId', e.target.value)}
        >
          <option value="">No linked item</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.status})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="sale-date">Sold Date</label>
        <input
          id="sale-date"
          type="date"
          className={inputClass}
          value={form.soldDate}
          onChange={(e) => update('soldDate', e.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="sale-price">Sold Price *</label>
        <input
          id="sale-price"
          type="number"
          step="0.01"
          min="0"
          className={inputClass}
          value={form.soldPrice}
          onChange={(e) => update('soldPrice', e.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="sale-platform">Platform</label>
        <select
          id="sale-platform"
          className={inputClass}
          value={form.platform}
          onChange={(e) => update('platform', e.target.value)}
        >
          {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="sale-shipping-cost">Shipping Cost</label>
        <input
          id="sale-shipping-cost"
          type="number"
          step="0.01"
          min="0"
          className={inputClass}
          value={form.shippingCost}
          onChange={(e) => update('shippingCost', e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="sale-shipping-collected">Shipping Collected</label>
        <input
          id="sale-shipping-collected"
          type="number"
          step="0.01"
          min="0"
          className={inputClass}
          value={form.shippingCollected}
          onChange={(e) => update('shippingCollected', e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="sale-tax">Sales Tax (auto-calculated)</label>
        <input
          id="sale-tax"
          type="number"
          step="0.01"
          min="0"
          className={inputClass}
          value={form.salesTax}
          onChange={(e) => update('salesTax', e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="sale-fees">Platform Fees</label>
        <input
          id="sale-fees"
          type="number"
          step="0.01"
          min="0"
          className={inputClass}
          value={form.platformFees}
          onChange={(e) => update('platformFees', e.target.value)}
        />
      </div>
    </div>
  );
}