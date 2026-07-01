'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/header';
import { formatDateForInput } from '@/lib/utils';

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

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function EditMileageClient({ entry }: { entry: MileageEntry }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [date, setDate] = useState(formatDateForInput(entry.date));
  const [miles, setMiles] = useState(entry.miles.toString());
  const [fromLocation, setFromLocation] = useState(entry.fromLocation || '');
  const [toLocation, setToLocation] = useState(entry.toLocation || '');
  const [address, setAddress] = useState(entry.address || '');
  const [vehicle, setVehicle] = useState(entry.vehicle || '');
  const [purpose, setPurpose] = useState(entry.purpose || '');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/mileage/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          miles: parseFloat(miles),
          fromLocation: fromLocation || undefined,
          toLocation: toLocation || undefined,
          address: address || undefined,
          vehicle: vehicle || undefined,
          purpose: purpose || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update entry');

      router.push('/mileage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/mileage" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-2">
            ← Back to Mileage
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Mileage Entry</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Date *</label>
                <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Miles *</label>
                <input type="number" required min="0.1" step="0.1" value={miles} onChange={e => setMiles(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>From Location</label>
                <input type="text" value={fromLocation} onChange={e => setFromLocation(e.target.value)} className={inputClass} maxLength={200} />
              </div>
              <div>
                <label className={labelClass}>To Location</label>
                <input type="text" value={toLocation} onChange={e => setToLocation(e.target.value)} className={inputClass} maxLength={200} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} className={inputClass} maxLength={500} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Vehicle</label>
                <input type="text" value={vehicle} onChange={e => setVehicle(e.target.value)} className={inputClass} maxLength={100} />
              </div>
              <div>
                <label className={labelClass}>Purpose</label>
                <input type="text" value={purpose} onChange={e => setPurpose(e.target.value)} className={inputClass} maxLength={500} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/mileage"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors">
                Cancel
              </Link>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
