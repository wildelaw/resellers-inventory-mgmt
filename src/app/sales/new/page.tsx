'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/header';
import SalesEntryModal from '@/components/SalesEntryModal';

function NewSaleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<{ id: number; name: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(true);

  const preselectedItemId = searchParams.get('itemId');

  useEffect(() => {
    // Fetch available items (not yet sold)
    fetch('/api/inventory?pageSize=1000')
      .then((res) => res.json())
      .then((data) => {
        const availableItems = (data.items || data || [])
          .filter((item: { status: string }) => item.status === 'available' || item.status === 'listed')
          .map((item: { id: number; name: string }) => ({ id: item.id, name: item.name }));
        setItems(availableItems);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (data: Record<string, unknown>) => {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to record sale');
    }

    router.push('/sales');
    router.refresh();
  };

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Record Sale</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Fill in the sale details below. If you came from an item page, the item is already selected.
        </p>

        <SalesEntryModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            router.push('/sales');
          }}
          onSave={handleSave}
          items={items}
          initialData={preselectedItemId ? { itemId: parseInt(preselectedItemId) } : undefined}
        />

        {!modalOpen && (
          <div className="text-center py-8">
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Open Sale Form
            </button>
          </div>
        )}
      </main>
    </>
  );
}

export default function NewSalePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <NewSaleContent />
    </Suspense>
  );
}