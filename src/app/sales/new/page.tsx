'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ClientShell from '@/components/client-shell';
import SalesEntryModal from '@/components/SalesEntryModal';
import { apiGet } from '@/lib/api-client';

interface InventoryListResponse {
  items: { id: number; name: string; status: string }[];
}

function NewSaleInner() {
  const searchParams = useSearchParams();
  const itemId = searchParams.get('itemId');
  const [items, setItems] = useState<{ id: number; name: string; status: string }[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    apiGet<InventoryListResponse>('/api/inventory?pageSize=100').then((res) => {
      if (res.ok && res.data) setItems(res.data.items);
    });
  }, []);

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Record Sale</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-sm text-gray-500 mb-4">Use the form to record a new sale. A linked item&apos;s status will be set to sold.</p>
        <button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm">Open sale form</button>
      </div>
      <SalesEntryModal
        open={open}
        items={items}
        initial={itemId ? { itemId: Number(itemId) } : undefined}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          window.location.href = '/sales';
        }}
      />
    </>
  );
}

export default function NewSalePage() {
  return (
    <ClientShell>
      <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
        <NewSaleInner />
      </Suspense>
    </ClientShell>
  );
}