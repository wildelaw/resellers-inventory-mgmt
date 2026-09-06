'use client';

import { useRouter } from 'next/navigation';
import PageShell from '@/components/page-shell';
import SalesEntryModal from '@/components/SalesEntryModal';

// Standalone sale entry page — reuses the same modal form
export default function NewSalePage() {
  const router = useRouter();

  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Record Sale</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Recording a sale marks the item as sold and removes it from your active inventory.
      </p>
      <div className="max-w-2xl">
        <SalesEntryModal
          isOpen
          onClose={() => router.push('/sales')}
        />
      </div>
    </PageShell>
  );
}