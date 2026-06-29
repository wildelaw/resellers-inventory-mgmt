'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import SalesEntryModal from '@/components/SalesEntryModal';

interface Item { id: number; name: string; status: string; }

export default function NewSalePage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [taxRate, setTaxRate] = useState(0.0825);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((s) => {
      if (typeof s.sales_tax_rate === 'number') setTaxRate(s.sales_tax_rate);
    }).catch(() => {});
    fetch('/api/inventory?pageSize=100&status=available')
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Record a Sale</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Choose an item to link (optional), fill in the sale details, and save.
        </p>
        <SalesEntryModal
          open={open}
          items={items}
          taxRate={taxRate}
          onClose={() => router.push('/sales')}
          onSaved={() => router.push('/sales')}
        />
      </main>
    </div>
  );
}