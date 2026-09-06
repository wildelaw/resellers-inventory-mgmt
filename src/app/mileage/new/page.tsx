'use client';

import PageShell from '@/components/page-shell';
import MileageForm from '@/components/MileageForm';

export default function NewMileagePage() {
  const handleSubmit = async (data: Parameters<Parameters<typeof MileageForm>[0]['onSubmit']>[0]): Promise<string | null> => {
    const res = await fetch('/api/mileage', {
      method: 'POST',
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Add Trip</h1>
      <div className="max-w-2xl">
        <MileageForm submitLabel="Add Trip" onSubmit={handleSubmit} />
      </div>
    </PageShell>
  );
}