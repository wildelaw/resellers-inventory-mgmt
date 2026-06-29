'use client';

import { PLATFORM_LABELS } from '@/lib/constants';
import type { SaleFormState } from '@/hooks/useSaleForm';
import type { Platform } from '@/lib/constants';
import type { Item } from '@/lib/schema';

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export interface SaleFormFieldsProps {
  state: SaleFormState;
  computedTax: string;
  items?: Pick<Item, 'id' | 'name' | 'status'>[];
  onField: <K extends keyof SaleFormState>(key: K, value: SaleFormState[K]) => void;
  onToggleAutoTax: () => void;
}

export default function SaleFormFields({ state, computedTax, items, onField, onToggleAutoTax }: SaleFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="itemId">Linked item (optional)</label>
        <select
          id="itemId"
          className={inputClass}
          value={state.itemId}
          onChange={(e) => onField('itemId', e.target.value)}
        >
          <option value="">— None —</option>
          {items?.map((it) => (
            <option key={it.id} value={String(it.id)}>{it.name} ({it.status})</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="soldDate">Sold date</label>
        <input id="soldDate" type="date" className={inputClass} value={state.soldDate}
          onChange={(e) => onField('soldDate', e.target.value)} required />
      </div>

      <div>
        <label className={labelClass} htmlFor="soldPrice">Sold price ($)</label>
        <input id="soldPrice" type="number" step="0.01" min="0" className={inputClass} value={state.soldPrice}
          onChange={(e) => onField('soldPrice', e.target.value)} required />
      </div>

      <div>
        <label className={labelClass} htmlFor="platform">Platform</label>
        <select id="platform" className={inputClass} value={state.platform}
          onChange={(e) => onField('platform', e.target.value as Platform)}>
          {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="shippingCollected">Shipping collected ($)</label>
        <input id="shippingCollected" type="number" step="0.01" min="0" className={inputClass} value={state.shippingCollected}
          onChange={(e) => onField('shippingCollected', e.target.value)} />
      </div>

      <div>
        <label className={labelClass} htmlFor="shippingCost">Shipping cost ($)</label>
        <input id="shippingCost" type="number" step="0.01" min="0" className={inputClass} value={state.shippingCost}
          onChange={(e) => onField('shippingCost', e.target.value)} />
      </div>

      <div>
        <label className={labelClass} htmlFor="platformFees">Platform fees ($)</label>
        <input id="platformFees" type="number" step="0.01" min="0" className={inputClass} value={state.platformFees}
          onChange={(e) => onField('platformFees', e.target.value)} />
      </div>

      <div className="sm:col-span-2">
        <div className="flex items-center justify-between mb-1">
          <label className={labelClass} htmlFor="salesTax">Sales tax ($)</label>
          <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <input type="checkbox" checked={state.autoTax} onChange={onToggleAutoTax} />
            auto-calculate
          </label>
        </div>
        <input id="salesTax" type="number" step="0.01" min="0" className={inputClass}
          value={state.autoTax ? computedTax : state.salesTax}
          onChange={(e) => onField('salesTax', e.target.value)}
          disabled={state.autoTax} />
      </div>
    </div>
  );
}