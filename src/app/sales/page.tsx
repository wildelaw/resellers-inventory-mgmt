'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/header';
import { PLATFORM_LABELS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function SalesPage() {
  const { data: session } = useSession();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { if (session) fetchSales(); }, [session, page]);

  const fetchSales = async () => {
    setLoading(true);
    const res = await fetch(`/api/sales?page=${page}`);
    const data = await res.json();
    setSales(data.sales || []);
    setTotalPages(data.pagination?.totalPages || 1);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales</h1>
          <a href="/sales/new" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md">Record Sale</a>
        </div>
        {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : sales.length === 0 ? <div className="text-center py-12 text-gray-500">No sales yet.</div> : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900"><tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sales.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm">{formatDate(sale.soldDate)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(sale.soldPrice)}</td>
                    <td className="px-4 py-3 text-sm">{PLATFORM_LABELS[sale.platform as keyof typeof PLATFORM_LABELS] || sale.platform}</td>
                    <td className="px-4 py-3 text-sm">{sale.item?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm"><a href={`/sales/${sale.id}`} className="text-blue-600 hover:underline">View</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && <div className="flex justify-between mt-4"><button onClick={() => setPage(p => p-1)} disabled={page<=1} className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50">Prev</button><span className="text-sm text-gray-500">Page {page}</span><button onClick={() => setPage(p => p+1)} disabled={page>=totalPages} className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50">Next</button></div>}
      </main>
    </div>
  );
}
