'use client';

import { use, useEffect, useState } from 'react';
import PageShell from '@/components/page-shell';
import MileageForm, { type MileageFormData } from '@/components/MileageForm';

export default function EditMileagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [initial, setInitial] = useState<Partial<MileageFormData> | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetch(`/api/mileage/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load trip'))))
      .then((trip) => {
        setInitial({
          date: trip.date.slice(0, 10),
          miles: String(trip.miles),
          fromLocation: trip.fromLocation ?? '',
          toLocation: trip.toLocation ?? '',
          address: trip.address ?? '',
          vehicle: trip.vehicle ?? '',
          purpose: trip.purpose ?? '',
        });
      })
      .catch(() => setLoadError('Failed to load trip'));
  }, [id]);

  const handleSubmit = async (data: MileageFormData): Promise<string | null> => {
    const res = await fetch(`/api/mileage/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: data.date,
        miles: data.miles,
        fromLocation: data.fromLocation || undefined,
        toLocation: data.toLocation || undefined,
        address: data.address || undefined,
        vehicle: data.vehicle || undefined,
        purpose: data.purpose || undefined,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return json.details ? json.details.join('. ') : json.error || 'Failed to save trip';
    }
    return null;
  };

  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Trip</h1>
      <div className="max-w-2xl">
        {initial ? (
          <MileageForm initial={initial} submitLabel="Save Changes" onSubmit={handleSubmit} />
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{loadError || 'Loading…'}</p>
        )}
      </div>
    </PageShell>
  );
}