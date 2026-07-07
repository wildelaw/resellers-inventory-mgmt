'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ALL_PLATFORMS, PLATFORM_LABELS, type Platform } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';

interface SalesClientProps {
  initialSales: any[];
  initialTotal: number;
  canViewAll: boolean;
}

export default function SalesClient({ initialSales, initialTotal, canViewAll }: SalesClientProps) {
  const [sales, setSales] = useState(initialSales);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (platformFilter) params.set('platform', platformFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const res = await fetch(`/api/sales?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSales(data.items);
    }
    setLoading(false);
  }, [search, platformFilter, startDate, endDate]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    window.open(`/api/sales/export?${params}`, '_blank');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales</h1>
        <Link href="/sales/new" className="btn-primary">Record Sale</Link>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); fetchSales(); }} className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field" />
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="input-field">
            <option value="">All Platforms</option>
            {ALL_PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
          </select>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
          <div className="flex space-x-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? '...' : 'Filter'}</button>
            <button type="button" onClick={handleExport} className="btn-secondary">Export</button>
          </div>
        </div>
      </form>

      <div className="card overflow-x-auto">
        {sales.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">No sales found. Record your first sale to get started.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Item</th>
                <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
                <th className="text-right py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Price</th>
                <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Platform</th>
                <th className="text-right py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Profit</th>
                {canViewAll && <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Seller</th>}
                <th className="text-right py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
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
                  <tr key={sale.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="py-2 px-2 text-sm">{sale.item?.name || '(No item)'}</td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-300">{formatDate(sale.soldDate)}</td>
                    <td className="py-2 px-2 text-right text-sm">{formatCurrency(sale.soldPrice)}</td>
                    <td className="py-2 px-2 text-sm">{PLATFORM_LABELS[sale.platform as Platform] || sale.platform}</td>
                    <td className={`py-2 px-2 text-right text-sm font-medium ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(profit)}
                      {sale.refundAmount > 0 && <span className="text-xs text-red-500 block">Refund: {formatCurrency(sale.refundAmount)}</span>}
                    </td>
                    {canViewAll && <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-300">{sale.seller?.name}</td>}
                    <td className="py-2 px-2 text-right">
                      <Link href={`/sales/${sale.id}`} className="text-blue-600 dark:text-blue-400 text-sm hover:underline">View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}