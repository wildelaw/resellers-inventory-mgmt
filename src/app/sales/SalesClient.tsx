'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PLATFORM_LABELS, ALL_PLATFORMS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SaleRow {
  id: number;
  itemId: number | null;
  soldDate: number;
  soldPrice: number;
  platform: string;
  refundType: string;
  refundAmount: number | null;
  soldBy: number;
  item?: { name: string } | null;
  seller?: { name: string } | null;
}

interface Props {
  initialSales: SaleRow[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  initialPlatform?: string;
  initialSearch?: string;
}

export default function SalesClient({
  initialSales, initialTotal, initialPage, initialPageSize,
  initialPlatform = '', initialSearch = '',
}: Props) {
  const router = useRouter();
  const [rows] = useState(initialSales);

  useEffect(() => { /* no-op; server refreshes on navigation */ }, [initialSales]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Platform</label>
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            value={initialPlatform}
            onChange={(e) => router.push(`/sales?platform=${encodeURIComponent(e.target.value)}`)}
          >
            <option value="">All</option>
            {ALL_PLATFORMS.map((p) => (
              <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <form
          className="flex-1 min-w-[200px]"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            router.push(`/sales?search=${encodeURIComponent(String(fd.get('search') ?? ''))}`);
          }}
        >
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
          <input
            name="search"
            defaultValue={initialSearch}
            placeholder="Item name, refund reason"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
        </form>
        <a
          href="/api/sales/export"
          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm"
        >
          Export CSV
        </a>
        <Link href="/sales/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
          Record Sale
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center text-gray-500 dark:text-gray-400">
          No sales found.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sold price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Refund</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm">{formatDate(sale.soldDate)}</td>
                  <td className="px-4 py-3 text-sm">{sale.item?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">{PLATFORM_LABELS[sale.platform as keyof typeof PLATFORM_LABELS] ?? sale.platform}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(sale.soldPrice)}</td>
                  <td className="px-4 py-3 text-sm">
                    {sale.refundAmount && sale.refundAmount > 0 ? formatCurrency(sale.refundAmount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/sales/${sale.id}`} className="text-blue-600 hover:underline text-sm">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}