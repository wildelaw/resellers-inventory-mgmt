'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PLATFORM_LABELS, REFUND_TYPE_LABELS, type SalePlatform, type RefundType } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';

interface Sale {
  id: number;
  itemId: number | null;
  soldDate: number;
  soldPrice: number;
  shippingCost: number | null;
  shippingCollected: number | null;
  platform: SalePlatform;
  salesTax: number | null;
  platformFees: number | null;
  refundAmount: number | null;
  refundReason: string | null;
  refundType: RefundType;
  soldBy: number;
  item?: { id: number; name: string; purchasePrice: number } | null;
  seller?: { name: string } | null;
}

export default function SalesClient({ initialSales }: { initialSales: Sale[] }) {
  const [sales] = useState(initialSales);
  const [filterPlatform, setFilterPlatform] = useState('');

  const filtered = sales.filter((s) => !filterPlatform || s.platform === filterPlatform);

  return (
    <div>
      <div className="mb-4">
        <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="input-field sm:w-48">
          <option value="">All Platforms</option>
          {Object.entries(PLATFORM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-2 px-3">Date</th>
              <th className="text-left py-2 px-3">Item</th>
              <th className="text-left py-2 px-3">Platform</th>
              <th className="text-right py-2 px-3">Price</th>
              <th className="text-right py-2 px-3">Profit</th>
              <th className="text-left py-2 px-3">Refund</th>
              <th className="text-left py-2 px-3">Seller</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sale) => {
              const profit = calculateProfit({
                soldPrice: sale.soldPrice,
                shippingCollected: sale.shippingCollected,
                salesTax: sale.salesTax,
                platformFees: sale.platformFees,
                refundAmount: sale.refundAmount,
                purchasePrice: sale.item?.purchasePrice ?? 0,
                shippingCost: sale.shippingCost,
              });
              return (
                <tr key={sale.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-2 px-3"><Link href={`/sales/${sale.id}`} className="text-blue-600 hover:underline">{formatDate(sale.soldDate)}</Link></td>
                  <td className="py-2 px-3">{sale.item?.name || '—'}</td>
                  <td className="py-2 px-3">{PLATFORM_LABELS[sale.platform]}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(sale.soldPrice)}</td>
                  <td className={`py-2 px-3 text-right ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(profit)}</td>
                  <td className="py-2 px-3">{sale.refundType !== 'none' ? REFUND_TYPE_LABELS[sale.refundType] : '—'}</td>
                  <td className="py-2 px-3">{sale.seller?.name || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-gray-500">No sales found.</div>}
    </div>
  );
}