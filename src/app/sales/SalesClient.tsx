'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PLATFORM_LABELS } from '@/lib/constants';
import SalesEntryModal from '@/components/SalesEntryModal';

interface Props { initialSales: any[]; }

export default function SalesClient({ initialSales }: Props) {
  const [sales, setSales] = useState(initialSales);
  const [showNewSale, setShowNewSale] = useState(false);

  const refresh = async () => {
    const res = await fetch('/api/sales');
    const data = await res.json();
    setSales(data.sales || []);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales</h1>
        <button onClick={() => setShowNewSale(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">Record Sale</button>
      </div>
      {sales.length === 0 ? (<p className="text-gray-500 dark:text-gray-400">No sales recorded yet.</p>) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700"><tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Platform</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sales.map((sale: any) => (
                <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-gray-900 dark:text-white">{formatDate(sale.soldDate)}</td>
                  <td className="px-6 py-4"><Link href={`/sales/${sale.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">{sale.item?.name || `Item #${sale.itemId || '?'}`}</Link></td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white">{formatCurrency(sale.soldPrice)}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{PLATFORM_LABELS[sale.platform as keyof typeof PLATFORM_LABELS] || sale.platform}</td>
                  <td className="px-6 py-4">{sale.refundType !== 'none' ? <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Refunded</span> : <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Complete</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <SalesEntryModal isOpen={showNewSale} onClose={() => setShowNewSale(false)} onSaved={refresh} />
    </div>
  );
}