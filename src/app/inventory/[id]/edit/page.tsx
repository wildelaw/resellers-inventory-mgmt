'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/page-shell';
import ItemForm, { type ItemFormData } from '@/components/ItemForm';

export default function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [initial, setInitial] = useState<Partial<ItemFormData> | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetch(`/api/inventory/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load item'))))
      .then((item) => {
        setInitial({
          name: item.name,
          description: item.description ?? '',
          purchaseDate: item.purchaseDate.slice(0, 10),
          purchasePrice: String(item.purchasePrice),
          purchaseLocation: item.purchaseLocation ?? '',
          category: item.category ?? '',
          notes: item.notes ?? '',
          status: item.status,
        });
      })
      .catch(() => setLoadError('Failed to load item'));
  }, [id]);

  const handleSubmit = async (data: ItemFormData): Promise<string | null> => {
    const payload: Record<string, unknown> = {
      name: data.name,
      description: data.description || undefined,
      purchaseDate: data.purchaseDate,
      purchasePrice: data.purchasePrice,
      purchaseLocation: data.purchaseLocation || undefined,
      category: data.category || undefined,
      notes: data.notes || undefined,
    };
    if (data.status && data.status !== initial?.status) {
      payload.status = data.status;
    }

    const res = await fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return json.details ? json.details.join('. ') : json.error || 'Failed to update item';
    }
    router.push(`/inventory/${id}`);
    return null;
  };

  if (loadError) {
    return (
      <PageShell>
        <p className="text-red-600 dark:text-red-400">{loadError}</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Item</h1>
      <div className="max-w-2xl">
        {initial ? (
          <ItemForm
            initial={initial}
            submitLabel="Save Changes"
            loadingLabel="Saving…"
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/inventory/${id}`)}
          />
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        )}
      </div>
    </PageShell>
  );
}