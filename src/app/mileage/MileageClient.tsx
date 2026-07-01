'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface MileageEntry {
  id: number;
  date: number;
  miles: number;
  fromLocation: string | null;
  toLocation: string | null;
  vehicle: string | null;
  purpose: string | null;
}

export default function MileageClient({ initialEntries }: { initialEntries: MileageEntry[] }) {
  const [entries] = useState(initialEntries);
  const totalMiles = entries.reduce((sum, e) => sum + e.miles, 0);

  return (
    <div>
      <div className="card mb-6">
        <p className="text-sm text-gray-500">Total Miles</p>
        <p className="text-3xl font-bold">{totalMiles.toFixed(1)}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-2 px-3">Date</th>
              <th className="text-right py-2 px-3">Miles</th>
              <th className="text-left py-2 px-3">From</th>
              <th className="text-left py-2 px-3">To</th>
              <th className="text-left py-2 px-3">Vehicle</th>
              <th className="text-left py-2 px-3">Purpose</th>
              <th className="text-left py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="py-2 px-3">{formatDate(e.date)}</td>
                <td className="py-2 px-3 text-right">{e.miles.toFixed(1)}</td>
                <td className="py-2 px-3">{e.fromLocation || '—'}</td>
                <td className="py-2 px-3">{e.toLocation || '—'}</td>
                <td className="py-2 px-3">{e.vehicle || '—'}</td>
                <td className="py-2 px-3">{e.purpose || '—'}</td>
                <td className="py-2 px-3"><Link href={`/mileage/${e.id}/edit`} className="text-blue-600 hover:underline">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {entries.length === 0 && <div className="text-center py-12 text-gray-500">No mileage entries. <Link href="/mileage/new" className="text-blue-600 hover:underline">Add one</Link></div>}
    </div>
  );
}