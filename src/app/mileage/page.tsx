'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/header';

export default function MileagePage() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (session) fetchEntries(); }, [session]);
  const fetchEntries = async () => { const res = await fetch('/api/mileage'); const data = await res.json(); setEntries(data.mileage || []); setLoading(false); };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mileage</h1>
          <a href="/mileage/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Add Entry</a>
        </div>
        {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : entries.length === 0 ? <div className="text-center py-12 text-gray-500">No mileage entries yet.</div> : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900"><tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miles</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {entries.map((e: any) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm">{new Date(e.date * 1000).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{e.miles}</td>
                    <td className="px-4 py-3 text-sm">{e.fromLocation || '—'}</td>
                    <td className="px-4 py-3 text-sm">{e.toLocation || '—'}</td>
                    <td className="px-4 py-3 text-sm"><a href={`/mileage/${e.id}/edit`} className="text-blue-600 hover:underline">Edit</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
