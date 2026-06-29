'use client';

import { ALL_PLATFORMS, PLATFORM_LABELS } from '@/lib/constants';
import type { SaleFormState } from '@/hooks/useSaleForm';

interface Props {
  state: SaleFormState;
  update: (key: keyof SaleFormState, value: string | boolean) => void;
  items?: Array<{ id: number; name: string; status: string }>;
  showItemPicker?: boolean;
}

const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';

export default function SaleFormFields({ state, update, items, showItemPicker = true }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {showItemPicker && (
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="itemId">Linked item (optional)</label>
          <select
            id="itemId"
            className={inputCls}
            value={state.itemId}
            onChange={(e) => update('itemId', e.target.value)}
          >
            <option value="">— No linked item —</option>
            {items?.map((it) => (
              <option key={it.id} value={it.id}>
                #{it.id} — {it.name} ({it.status})
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className={labelCls} htmlFor="soldDate">Sold date *</label>
        <input
          id="soldDate"
          type="date"
          className={inputCls}
          value={state.soldDate}
          onChange={(e) => update('soldDate', e.target.value)}
          required
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="soldPrice">Sold price *</label>
        <input
          id="soldPrice"
          type="number"
          step="0.01"
          min="0"
          className={inputCls}
          value={state.soldPrice}
          onChange={(e) => update('soldPrice', e.target.value)}
          required
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="platform">Platform</label>
        <select
          id="platform"
          className={inputCls}
          value={state.platform}
          onChange={(e) => update('platform', e.target.value)}
        >
          {ALL_PLATFORMS.map((p) => (
            <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="shippingCost">Shipping cost</label>
        <input
          id="shippingCost"
          type="number"
          step="0.01"
          min="0"
          className={inputCls}
          value={state.shippingCost}
          onChange={(e) => update('shippingCost', e.target.value)}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="shippingCollected">Shipping collected</label>
        <input
          id="shippingCollected"
          type="number"
          step="0.01"
          min="0"
          className={inputCls}
          value={state.shippingCollected}
          onChange={(e) => update('shippingCollected', e.target.value)}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="salesTax">Sales tax</label>
        <input
          id="salesTax"
          type="number"
          step="0.01"
          min="0"
          className={inputCls}
          value={state.salesTax}
          onChange={(e) => update('salesTax', e.target.value)}
        />
        <label className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <input
            type="checkbox"
            checked={state.applyTaxAuto}
            onChange={(e) => update('applyTaxAuto', e.target.checked)}
          />
          Auto-calculate from sold price
        </label>
      </div>
      <div>
        <label className={labelCls} htmlFor="platformFees">Platform fees</label>
        <input
          id="platformFees"
          type="number"
          step="0.01"
          min="0"
          className={inputCls}
          value={state.platformFees}
          onChange={(e) => update('platformFees', e.target.value)}
        />
      </div>
    </div>
  );
}