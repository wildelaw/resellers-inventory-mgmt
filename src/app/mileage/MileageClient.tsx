'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/header';
import ConfirmModal from '@/components/ConfirmModal';
import { formatDate } from '@/lib/utils';

interface MileageEntry {
  id: number;
  date: string | Date;
  miles: number;
  fromLocation?: string | null;
  toLocation?: string | null;
  address?: string | null;
  vehicle?: string | null;
  purpose?: string | null;
}

interface Props {
  initialEntries: MileageEntry[];
}

export default function MileagePage({ initialEntries }: Props) {
  const [entries, setEntries] = useState<MileageEntry[]>(initialEntries);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.purpose?.toLowerCase().includes(q) ||
      e.vehicle?.toLowerCase().includes(q) ||
      e.fromLocation?.toLowerCase().includes(q) ||
      e.toLocation?.toLowerCase().includes(q) ||
      e.address?.toLowerCase().includes(q)
    );
  });

  const totalMiles = filtered.reduce((sum, e) => sum + e.miles, 0);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/mileage/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setEntries(prev => prev.filter(e => e.id !== deleteId));
        setDeleteId(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const exportCsv = async () => {
    const res = await fetch('/api/mileage/export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mileage-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mileage</h1>
          <div className="flex gap-2">
            <button onClick={exportCsv}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Export CSV
            </button>
            <Link href="/mileage/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              + Add Entry
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Trips</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{filtered.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Miles</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalMiles.toFixed(1)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <input
            type="text"
            placeholder="Search mileage entries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No mileage entries found.</p>
            <Link href="/mileage/new" className="mt-4 inline-block text-blue-600 hover:text-blue-700 text-sm">
              Add your first entry →
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Miles</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Purpose</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">{entry.miles.toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {entry.fromLocation && entry.toLocation
                        ? `${entry.fromLocation} → ${entry.toLocation}`
                        : entry.address || entry.fromLocation || entry.toLocation || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{entry.vehicle || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{entry.purpose || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/mileage/${entry.id}/edit`} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">Edit</Link>
                        <button onClick={() => setDeleteId(entry.id)} className="text-xs text-red-600 hover:text-red-700 dark:text-red-400">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Entry"
        message="Are you sure you want to delete this mileage entry?"
        confirmLabel="Delete"
        danger
        loading={deleteLoading}
      />
    </div>
  );
}
