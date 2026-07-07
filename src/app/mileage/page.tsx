'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/header';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export default function MileagePage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/mileage').then((r) => r.json()).then((d) => { setEntries(d.mileage || []); setLoading(false); });
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this entry?')) return;
    const res = await fetch(`/api/mileage/${id}`, { method: 'DELETE' });
    if (res.ok) { const d = await fetch('/api/mileage').then((r) => r.json()); setEntries(d.mileage || []); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mileage</h1>
          <div className="flex gap-2">
            <a href="/api/mileage/export" className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">Export CSV</a>
            <Link href="/mileage/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">Add Entry</Link>
          </div>
        </div>
        {loading ? <p className="text-gray-500">Loading...</p> :
         entries.length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-center py-8">No mileage entries yet.</p> : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700"><tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Miles</th><th className="px-4 py-3 text-left">From</th><th className="px-4 py-3 text-left">To</th><th className="px-4 py-3 text-left">Vehicle</th><th className="px-4 py-3 text-left">Purpose</th><th className="px-4 py-3"></th></tr></thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-3">{formatDate(e.date)}</td>
                    <td className="px-4 py-3">{e.miles}</td>
                    <td className="px-4 py-3">{e.fromLocation || '—'}</td>
                    <td className="px-4 py-3">{e.toLocation || '—'}</td>
                    <td className="px-4 py-3">{e.vehicle || '—'}</td>
                    <td className="px-4 py-3">{e.purpose || '—'}</td>
                    <td className="px-4 py-3"><div className="flex gap-2"><Link href={`/mileage/${e.id}/edit`} className="text-blue-600 text-sm">Edit</Link><button onClick={() => handleDelete(e.id)} className="text-red-500 text-sm">Delete</button></div></td>
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
