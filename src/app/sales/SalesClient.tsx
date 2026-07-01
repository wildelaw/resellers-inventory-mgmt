'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/header';
import SalesEntryModal from '@/components/SalesEntryModal';
import ConfirmModal from '@/components/ConfirmModal';
import { PLATFORM_LABELS } from '@/lib/constants';
import type { Platform } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';

interface Sale {
  id: number;
  soldDate: string | Date;
  soldPrice: number;
  shippingCost?: number | null;
  shippingCollected?: number | null;
  platform: Platform;
  salesTax?: number | null;
  platformFees?: number | null;
  refundAmount?: number | null;
  refundType: string;
  item?: { id: number; name: string; purchasePrice: number } | null;
  seller?: { id: number; name: string } | null;
}

interface InventoryItem {
  id: number;
  name: string;
  purchasePrice: number;
  status: string;
}

interface Props {
  initialSales: Sale[];
  availableItems: InventoryItem[];
  canViewAll: boolean;
}

export default function SalesClient({ initialSales, availableItems, canViewAll }: Props) {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [deleteSaleId, setDeleteSaleId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = sales.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.item?.name.toLowerCase().includes(q) ||
      s.platform.toLowerCase().includes(q) ||
      s.seller?.name.toLowerCase().includes(q)
    );
  });

  const handleDelete = async () => {
    if (!deleteSaleId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/sales/${deleteSaleId}`, { method: 'DELETE' });
      if (res.ok) {
        setSales(prev => prev.filter(s => s.id !== deleteSaleId));
        setDeleteSaleId(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaleSuccess = async () => {
    const res = await fetch('/api/sales?pageSize=50');
    const data = await res.json();
    setSales(data.sales || []);
    setSaleModalOpen(false);
  };

  const exportCsv = async () => {
    const res = await fetch('/api/mileage/export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalProfit = filtered.reduce((sum, s) => {
    if (!s.item) return sum;
    return sum + calculateProfit({
      soldPrice: s.soldPrice,
      shippingCollected: s.shippingCollected,
      salesTax: s.salesTax,
      platformFees: s.platformFees,
      refundAmount: s.refundAmount,
      purchasePrice: s.item.purchasePrice,
      shippingCost: s.shippingCost,
    });
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setSaleModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              + Record Sale
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Sales</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{filtered.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(filtered.reduce((s, sale) => s + sale.soldPrice, 0))}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Profit</p>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalProfit)}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <input
            type="text"
            placeholder="Search sales..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No sales found.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Platform</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map(sale => {
                  const profit = sale.item ? calculateProfit({
                    soldPrice: sale.soldPrice,
                    shippingCollected: sale.shippingCollected,
                    salesTax: sale.salesTax,
                    platformFees: sale.platformFees,
                    refundAmount: sale.refundAmount,
                    purchasePrice: sale.item.purchasePrice,
                    shippingCost: sale.shippingCost,
                  }) : null;
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <Link href={`/sales/${sale.id}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                          {sale.item?.name || '(No item)'}
                        </Link>
                        {canViewAll && sale.seller && (
                          <p className="text-xs text-gray-400">{sale.seller.name}</p>
                        )}
                        {sale.refundType !== 'none' && (
                          <span className="text-xs text-orange-600 dark:text-orange-400"> (Refunded)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(sale.soldDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">
                        {PLATFORM_LABELS[sale.platform]}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(sale.soldPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {profit !== null ? (
                          <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(profit)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/sales/${sale.id}`} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">View</Link>
                          <button onClick={() => setDeleteSaleId(sale.id)}
                            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <SalesEntryModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        onSuccess={handleSaleSuccess}
        items={availableItems}
      />

      <ConfirmModal
        isOpen={deleteSaleId !== null}
        onClose={() => setDeleteSaleId(null)}
        onConfirm={handleDelete}
        title="Delete Sale"
        message="Are you sure you want to delete this sale? The item status will revert to available."
        confirmLabel="Delete"
        danger
        loading={deleteLoading}
      />
    </div>
  );
}
