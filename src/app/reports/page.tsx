'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/header';
import { formatCurrency } from '@/lib/utils';

export default function ReportsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { if (session) fetchReports(); }, [session, startDate, endDate]);

  const fetchReports = async () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const res = await fetch(`/api/reports?${params}`);
    const d = await res.json();
    setData(d); setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Reports</h1>
        <div className="flex gap-4 mb-6">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">From</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">To</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" /></div>
        </div>
        {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"><h3 className="text-sm font-medium text-gray-500">Total Profit</h3><p className="text-2xl font-bold text-green-600">{formatCurrency(data.profit?.totalProfit || 0)}</p></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"><h3 className="text-sm font-medium text-gray-500">Net Revenue</h3><p className="text-2xl font-bold">{formatCurrency(data.profit?.totalNetRevenue || 0)}</p></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"><h3 className="text-sm font-medium text-gray-500">Total Sales</h3><p className="text-2xl font-bold">{data.sales?.count || 0}</p></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"><h3 className="text-sm font-medium text-gray-500">Total Items</h3><p className="text-2xl font-bold">{data.inventory?.total || 0}</p></div>
          </div>
        )}
      </main>
    </div>
  );
}
