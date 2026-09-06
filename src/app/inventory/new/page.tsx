'use client';

import { useRouter } from 'next/navigation';
import PageShell from '@/components/page-shell';
import ItemForm, { type ItemFormData } from '@/components/ItemForm';

export default function NewItemPage() {
  const router = useRouter();

  const handleSubmit = async (data: ItemFormData): Promise<string | null> => {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        description: data.description || undefined,
        purchaseDate: data.purchaseDate,
        purchasePrice: data.purchasePrice,
        purchaseLocation: data.purchaseLocation || undefined,
        category: data.category || undefined,
        notes: data.notes || undefined,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return json.details ? json.details.join('. ') : json.error || 'Failed to create item';
    }
    router.push('/inventory');
    return null;
  };

  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Add Item</h1>
      <div className="max-w-2xl">
        <ItemForm
          submitLabel="Create Item"
          loadingLabel="Creating…"
          onSubmit={handleSubmit}
          onCancel={() => router.push('/inventory')}
        />
      </div>
    </PageShell>
  );
}