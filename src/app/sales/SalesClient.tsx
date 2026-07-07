'use client';
import { useState } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PLATFORM_LABELS } from '@/lib/constants';
import { calculateProfit } from '@/lib/financial';
import SalesEntryModal from '@/components/SalesEntryModal';

interface SaleRow { id: number; itemId: number | null; soldDate: number; soldPrice: number; platform: string; refundAmount: number; refundType: string; item: { name: string; purchasePrice: number } | null; }
interface Props { initialSales: SaleRow[]; canViewAll: boolean; }

export default function SalesClient({ initialSales }: Props) {
  const [sales, setSales] = useState(initialSales);
  const [showModal, setShowModal] = useState(false);

  const fetchSales = async () => {
    const res = await fetch('/api/sales');
    if (res.ok) {
      const data = await res.json();
      setSales(data.sales);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">Record Sale</button>
      </div>
      {sales.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No sales recorded yet.</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Platform</th>
                <th className="px-4 py-3 text-left">Profit</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => {
                const profit = calculateProfit({ ...s, purchasePrice: s.item?.purchasePrice ?? 0 });
                return (
                  <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-3"><Link href={`/sales/${s.id}`} className="text-blue-600 hover:text-blue-700">{s.item?.name || 'No item'}</Link></td>
                    <td className="px-4 py-3">{formatDate(s.soldDate)}</td>
                    <td className="px-4 py-3">{formatCurrency(s.soldPrice)}</td>
                    <td className="px-4 py-3">{PLATFORM_LABELS[s.platform as keyof typeof PLATFORM_LABELS] ?? s.platform}</td>
                    <td className={`px-4 py-3 font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(profit)}</td>
                    <td className="px-4 py-3">{s.refundAmount > 0 ? `Refunded ${formatCurrency(s.refundAmount)}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <SalesEntryModal open={showModal} onClose={() => setShowModal(false)} onSuccess={fetchSales} />
    </div>
  );
}
