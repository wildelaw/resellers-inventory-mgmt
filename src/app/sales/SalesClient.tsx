'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PageShell from '@/components/page-shell';
import SalesEntryModal from '@/components/SalesEntryModal';
import ConfirmModal from '@/components/ConfirmModal';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface SalesListSale {
  id: number;
  itemId: number | null;
  item: { id: number; name: string } | null;
  soldDate: string;
  soldPrice: number;
  shippingCollected: number | null;
  salesTax: number | null;
  platformFees: number | null;
  shippingCost: number | null;
  refundAmount: number | null;
  refundReason: string | null;
  platform: string;
  soldBy: number;
}

interface Props {
  initialSales: SalesListSale[];
  initialPagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export default function SalesClient({ initialSales, initialPagination }: Props) {
  const [sales, setSales] = useState(initialSales);
  const [pagination, setPagination] = useState(initialPagination);
  const [page, setPage] = useState(1);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SalesListSale | null>(null);
  const [deleteSale, setDeleteSale] = useState<SalesListSale | null>(null);
  const [error, setError] = useState('');

  const loadSales = useCallback(async (p: number) => {
    setError('');
    const params = new URLSearchParams({ page: String(p) });
    const res = await fetch(`/api/sales?${params}`);
    if (!res.ok) {
      setError('Failed to load sales');
      return;
    }
    const data = await res.json();
    setSales(data.items ?? []);
    setPagination(data.pagination ?? { page: p, pageSize: 20, total: 0, totalPages: 1 });
  }, []);

  useEffect(() => {
    if (page !== 1) loadSales(page);
  }, [page, loadSales]);

  const handleDelete = async () => {
    if (!deleteSale) return;
    setDeleteSale(null);
    const res = await fetch(`/api/sales/${deleteSale.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Delete failed');
      return;
    }
    await loadSales(page);
  };

  const totalPages = pagination.totalPages;

  return (
    <PageShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{pagination.total} sales recorded</p>
        </div>
        <button
          onClick={() => { setEditingSale(null); setSaleModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
        >
          Record Sale
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md text-sm">{error}</div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              {['Date', 'Item', 'Platform', 'Price', 'Tax', 'Fees', 'Shipping', 'Refund', ''].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sales.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No sales yet.</td></tr>
            )}
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{formatDate(sale.soldDate)}</td>
                <td className="px-4 py-2 text-sm">
                  {sale.item ? (
                    <Link href={`/inventory/${sale.item.id}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                      {sale.item.name}
                    </Link>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{sale.platform}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{formatCurrency(sale.soldPrice)}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{sale.salesTax ? formatCurrency(sale.salesTax) : '—'}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{sale.platformFees ? formatCurrency(sale.platformFees) : '—'}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                  {sale.shippingCollected ? `+${formatCurrency(sale.shippingCollected)}` : ''}
                  {sale.shippingCost ? ` −${formatCurrency(sale.shippingCost)}` : ''}
                </td>
                <td className="px-4 py-2 text-sm text-red-600 dark:text-red-400">{sale.refundAmount ? formatCurrency(sale.refundAmount) : '—'}</td>
                <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                  <Link href={`/sales/${sale.id}`} className="text-blue-600 hover:text-blue-700 mr-3">View</Link>
                  <button onClick={() => { setEditingSale(sale); setSaleModalOpen(true); }} className="text-blue-600 hover:text-blue-700 mr-3">Edit</button>
                  <button onClick={() => setDeleteSale(sale)} className="text-red-600 hover:text-red-700">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1.5 rounded-md text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1.5 rounded-md text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      <SalesEntryModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        sale={editingSale ? {
          id: editingSale.id,
          itemId: editingSale.item ? String(editingSale.item.id) : '',
          soldDate: editingSale.soldDate.slice(0, 10),
          soldPrice: String(editingSale.soldPrice),
          shippingCost: editingSale.shippingCost ? String(editingSale.shippingCost) : '',
          shippingCollected: editingSale.shippingCollected ? String(editingSale.shippingCollected) : '',
          platform: editingSale.platform,
          salesTax: editingSale.salesTax ? String(editingSale.salesTax) : '',
          platformFees: editingSale.platformFees ? String(editingSale.platformFees) : '',
        } : null}
      />

      <ConfirmModal
        isOpen={!!deleteSale}
        title="Delete Sale"
        message={`Delete this sale of "${deleteSale?.item?.name ?? 'unknown item'}"? The item will revert to available.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteSale(null)}
      />
    </PageShell>
  );
}