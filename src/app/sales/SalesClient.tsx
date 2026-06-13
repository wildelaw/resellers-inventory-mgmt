'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PLATFORMS, PLATFORM_LABELS } from '@/lib/constants';
import type { Platform } from '@/lib/constants';

interface EnrichedSale {
  id: number;
  itemId: number | null;
  itemName: string | null;
  soldDate: number;
  soldPrice: number;
  shippingCost: number | null;
  shippingCollected: number | null;
  platform: string;
  salesTax: number | null;
  platformFees: number | null;
  refundAmount: number | null;
  refundType: string;
  soldBy: number;
  createdAt: number;
  profit: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface SalesClientProps {
  initialSales: EnrichedSale[];
  pagination: Pagination;
  platformFilter?: string;
  platformLabels: Record<string, string>;
}

export default function SalesClient({
  initialSales,
  pagination,
  platformFilter,
  platformLabels,
}: SalesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`/sales?${params.toString()}`);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales</h1>
        <Link
          href="/sales/new"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          Record Sale
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <select
              value={platformFilter || ''}
              onChange={(e) => updateFilter('platform', e.target.value || null)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="">All Platforms</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{platformLabels[p]}</option>
              ))}
            </select>
          </div>
          {platformFilter && (
            <button
              onClick={() => router.push('/sales')}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {initialSales.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No sales found. Record your first sale to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Profit</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {initialSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href={`/sales/${sale.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                        {formatDate(sale.soldDate)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {sale.itemName ? (
                        <Link href={`/inventory/${sale.itemId}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                          {sale.itemName}
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formatCurrency(sale.soldPrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {platformLabels[sale.platform] || sale.platform}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(sale.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} sales
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/sales?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(pagination.page - 1) }).toString()}`}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Previous
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={`/sales?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(pagination.page + 1) }).toString()}`}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}