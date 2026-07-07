'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/header';
import { formatDate } from '@/lib/utils';
import ConfirmModal from '@/components/ConfirmModal';

export default function MileagePage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const res = await fetch(`/api/mileage?${params}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.items);
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/mileage/${deleteId}`, { method: 'DELETE' });
    setEntries(entries.filter(e => e.id !== deleteId));
    setShowDeleteConfirm(false);
    setDeleteId(null);
  };

  const totalMiles = entries.reduce((sum, e) => sum + e.miles, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mileage</h1>
          <div className="flex space-x-2">
            <button onClick={() => window.open('/api/mileage/export', '_blank')} className="btn-secondary">Export CSV</button>
            <Link href="/mileage/new" className="btn-primary">Add Entry</Link>
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
            </div>
            <button onClick={fetchEntries} disabled={loading} className="btn-primary">Filter</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Miles</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalMiles.toFixed(1)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Trips</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{entries.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Avg Miles/Trip</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{entries.length > 0 ? (totalMiles / entries.length).toFixed(1) : '0'}</p>
          </div>
        </div>

        <div className="card overflow-x-auto">
          {entries.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No mileage entries found.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Miles</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">From</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">To</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Purpose</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 px-2 text-sm">{formatDate(entry.date)}</td>
                    <td className="py-2 px-2 text-right text-sm font-medium">{entry.miles.toFixed(1)}</td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-300">{entry.fromLocation || '-'}</td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-300">{entry.toLocation || '-'}</td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-300">{entry.vehicle || '-'}</td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-300">{entry.purpose || '-'}</td>
                    <td className="py-2 px-2 text-right">
                      <Link href={`/mileage/${entry.id}/edit`} className="text-blue-600 dark:text-blue-400 text-sm hover:underline mr-3">Edit</Link>
                      <button onClick={() => { setDeleteId(entry.id); setShowDeleteConfirm(true); }} className="text-red-500 text-sm hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <ConfirmModal
          open={showDeleteConfirm}
          title="Delete Entry"
          message="Are you sure you want to delete this mileage entry?"
          confirmText="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteConfirm(false); setDeleteId(null); }}
        />
      </main>
    </div>
  );
}