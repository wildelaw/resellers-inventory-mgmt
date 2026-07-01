'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import SalesEntryModal from '@/components/SalesEntryModal';

export default function NewSalePage() {
  const [open, setOpen] = useState(true);
  const [taxRate, setTaxRate] = useState(0.0825);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((s) => {
      if (s.sales_tax_rate) setTaxRate(s.sales_tax_rate);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Record Sale</h1>
        <SalesEntryModal
          open={open}
          onClose={() => { setOpen(false); router.push('/sales'); }}
          onSuccess={() => { setOpen(false); router.push('/sales'); router.refresh(); }}
          taxRate={taxRate}
        />
      </main>
    </div>
  );
}