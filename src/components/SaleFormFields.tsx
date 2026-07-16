"use client";
import { ALL_PLATFORMS, PLATFORM_LABELS, type Platform } from "@/lib/constants";
import { useSaleForm, type SaleFormState } from "@/hooks/useSaleForm";

interface SaleFormFieldsProps {
  form: ReturnType<typeof useSaleForm>;
  initial?: Partial<SaleFormState>;
}

export default function SaleFormFields({ form }: SaleFormFieldsProps) {
  const { state, setField, computedSalesTax, computedTotal } = form;
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Sold Price ($)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={state.soldPrice}
          onChange={(e) => setField("soldPrice", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Platform</label>
        <select
          value={state.platform}
          onChange={(e) => setField("platform", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
        >
          {ALL_PLATFORMS.map((p: Platform) => (
            <option key={p} value={p}>
              {PLATFORM_LABELS[p]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Shipping Cost ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={state.shippingCost}
            onChange={(e) => setField("shippingCost", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Shipping Collected ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={state.shippingCollected}
            onChange={(e) => setField("shippingCollected", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Sales Tax ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={state.salesTax}
            onChange={(e) => setField("salesTax", e.target.value)}
            placeholder={`Auto: $${computedSalesTax.toFixed(2)}`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
          />
          <p className="text-xs text-gray-500 mt-1">
            At {(state.taxRate * 100).toFixed(2)}% tax rate
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Platform Fees ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={state.platformFees}
            onChange={(e) => setField("platformFees", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
          />
        </div>
      </div>
      <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 text-sm">
        <div>
          <span className="font-medium">Estimated Total:</span> ${computedTotal.toFixed(2)}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Auto-calculated sales tax ({(state.taxRate * 100).toFixed(2)}%): ${computedSalesTax.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
