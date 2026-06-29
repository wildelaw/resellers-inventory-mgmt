'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import ConfirmModal from '@/components/ConfirmModal';

interface MileageRow {
  id: number;
  date: number;
  miles: number;
  fromLocation: string | null;
  toLocation: string | null;
  vehicle: string | null;
  purpose: string | null;
}

interface Props {
  rows: MileageRow[];
  startDate: string;
  endDate: string;
}

export default function MileageClient({ rows, startDate, endDate }: Props) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const totalMiles = rows.reduce((s, r) => s + r.miles, 0);

  const confirmDelete = async () => {
    if (deleteId === null) return;
    setBusy(true);
    try {
      await fetch(`/api/mileage/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            value={startDate}
            onChange={(e) => router.push(`/mileage?startDate=${e.target.value}&endDate=${endDate}`)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            value={endDate}
            onChange={(e) => router.push(`/mileage?startDate=${startDate}&endDate=${e.target.value}`)}
          />
        </div>
        <a
          href={`/api/mileage/export?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`}
          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm"
        >
          Export CSV
        </a>
        <a
          href="/api/mileage/reports"
          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm"
        >
          Reports JSON
        </a>
        <Link href="/mileage/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
          Add Entry
        </Link>
      </div>
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Total: <strong>{totalMiles.toLocaleString()} mi</strong> across {rows.length} trips
      </div>
      {rows.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center text-gray-500 dark:text-gray-400">
          No mileage entries.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miles</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From → To</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-sm font-medium">{r.miles.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{r.fromLocation ?? '—'} → {r.toLocation ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">{r.vehicle ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">{r.purpose ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/mileage/${r.id}/edit`} className="text-blue-600 hover:underline text-sm mr-3">Edit</Link>
                    <button onClick={() => setDeleteId(r.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmModal
        open={deleteId !== null}
        title="Delete mileage entry"
        message="Permanently delete this mileage entry?"
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}