'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PLATFORM_LABELS } from '@/lib/constants';
import type { Platform } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';
import SalesEntryModal from '@/components/SalesEntryModal';

export interface SaleView {
  id: number;
  soldDate: number;
  soldPrice: number;
  shippingCost: number | null;
  shippingCollected: number | null;
  platform: Platform;
  platformFees: number | null;
  refundAmount: number | null;
  refundType: string;
  item: { id: number; name: string; purchasePrice: number } | null;
}

interface Props {
  initialSales: SaleView[];
  initialPagination: { page: number; pageSize: number; total: number; totalPages: number };
  platforms: string[];
}

export default function SalesClient({ initialSales, initialPagination, platforms }: Props) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value); else params.delete(key);
    params.set('page', '1');
    router.push(`/sales?${params.toString()}`);
  }

  function exportCsv() {
    const headers = ['id', 'soldDate', 'item', 'soldPrice', 'platform', 'profit'];
    const lines = [headers.join(',')];
    for (const s of initialSales) {
      const profit = calculateProfit({
        soldPrice: Number(s.soldPrice), shippingCollected: s.shippingCollected, salesTax: 0,
        platformFees: s.platformFees, refundAmount: s.refundAmount,
        purchasePrice: s.item?.purchasePrice ?? 0, shippingCost: s.shippingCost,
      });
      lines.push([s.id, formatDate(s.soldDate), `"${s.item?.name ?? ''}"`, s.soldPrice, s.platform, profit.toFixed(2)].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sales.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const inputClass = 'px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Sales</h1>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 px-4 py-2 rounded-md text-sm">Export CSV</button>
          <button onClick={() => setShowModal(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm">Record Sale</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 flex flex-wrap gap-2">
        <select className={inputClass} defaultValue={sp.get('platform') || ''} onChange={(e) => applyFilter('platform', e.target.value)}>
          <option value="">All platforms</option>
          {platforms.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p as Platform]}</option>)}
        </select>
        <input type="date" className={inputClass} defaultValue={sp.get('startDate') || ''} onChange={(e) => applyFilter('startDate', e.target.value)} />
        <input type="date" className={inputClass} defaultValue={sp.get('endDate') || ''} onChange={(e) => applyFilter('endDate', e.target.value)} />
        <Link href="/sales" className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Clear</Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-left">
            <tr>
              <th className="p-3">Date</th><th className="p-3">Item</th><th className="p-3">Platform</th>
              <th className="p-3">Price</th><th className="p-3">Profit</th><th className="p-3">Refund</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {initialSales.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-500">No sales found.</td></tr>}
            {initialSales.map((s) => {
              const profit = calculateProfit({
                soldPrice: Number(s.soldPrice), shippingCollected: s.shippingCollected, salesTax: 0,
                platformFees: s.platformFees, refundAmount: s.refundAmount,
                purchasePrice: s.item?.purchasePrice ?? 0, shippingCost: s.shippingCost,
              });
              return (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="p-3"><Link href={`/sales/${s.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{formatDate(s.soldDate)}</Link></td>
                  <td className="p-3">{s.item?.name || '—'}</td>
                  <td className="p-3">{PLATFORM_LABELS[s.platform]}</td>
                  <td className="p-3">{formatCurrency(s.soldPrice)}</td>
                  <td className={`p-3 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(profit)}</td>
                  <td className="p-3">{s.refundType !== 'none' ? formatCurrency(s.refundAmount) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-300">
        <span>{initialPagination.total} sale{initialPagination.total === 1 ? '' : 's'}</span>
        <div className="flex gap-1">
          {Array.from({ length: Math.max(1, initialPagination.totalPages) }, (_, i) => i + 1).slice(0, 10).map((p) => (
            <Link key={p} href={`/sales?page=${p}`} className={`px-3 py-1 rounded ${p === initialPagination.page ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{p}</Link>
          ))}
        </div>
      </div>

      <SalesEntryModal open={showModal} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); router.refresh(); }} />
    </div>
  );
}