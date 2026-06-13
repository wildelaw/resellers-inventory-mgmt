'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/header';
import RefundEntryModal from '@/components/RefundEntryModal';
import ConfirmModal from '@/components/ConfirmModal';
import { PLATFORM_LABELS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function SaleDetailPage() {
  const params = useParams(); const router = useRouter(); const { data: session } = useSession();
  const [sale, setSale] = useState<any>(null); const [loading, setLoading] = useState(true);
  const [showRefund, setShowRefund] = useState(false); const [showDelete, setShowDelete] = useState(false);

  useEffect(() => { fetchSale(); }, []);

  const fetchSale = async () => {
    const res = await fetch(`/api/sales/${params.id}`);
    if (!res.ok) { router.push('/sales'); return; }
    const data = await res.json(); setSale(data.sale); setLoading(false);
  };

  const handleRefund = async (data: any) => {
    await fetch('/api/sales', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    fetchSale(); setShowRefund(false);
  };

  const handleDelete = async () => {
    await fetch(`/api/sales/${params.id}`, { method: 'DELETE' });
    router.push('/sales');
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900"><Header /><div className="text-center py-12 text-gray-500">Loading...</div></div>;
  if (!sale) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sale #{sale.id}</h1>
          <div className="flex gap-2">
            {sale.refundType === 'none' && <button onClick={() => setShowRefund(true)} className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm">Process Refund</button>}
            <button onClick={() => setShowDelete(true)} className="px-4 py-2 bg-red-500 text-white rounded-md text-sm">Delete</button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-sm text-gray-500">Price</dt><dd className="text-lg font-semibold">{formatCurrency(sale.soldPrice)}</dd></div>
            <div><dt className="text-sm text-gray-500">Date</dt><dd>{formatDate(sale.soldDate)}</dd></div>
            <div><dt className="text-sm text-gray-500">Platform</dt><dd>{PLATFORM_LABELS[sale.platform as keyof typeof PLATFORM_LABELS] || sale.platform}</dd></div>
            {sale.shippingCost && <div><dt className="text-sm text-gray-500">Shipping Cost</dt><dd>{formatCurrency(sale.shippingCost)}</dd></div>}
            {sale.shippingCollected && <div><dt className="text-sm text-gray-500">Shipping Collected</dt><dd>{formatCurrency(sale.shippingCollected)}</dd></div>}
            {sale.salesTax && <div><dt className="text-sm text-gray-500">Sales Tax</dt><dd>{formatCurrency(sale.salesTax)}</dd></div>}
            {sale.platformFees && <div><dt className="text-sm text-gray-500">Platform Fees</dt><dd>{formatCurrency(sale.platformFees)}</dd></div>}
            {sale.refundAmount > 0 && <div><dt className="text-sm text-gray-500">Refund</dt><dd className="text-red-600">{formatCurrency(sale.refundAmount)}</dd></div>}
          </dl>
        </div>
      </main>
      <RefundEntryModal isOpen={showRefund} onClose={() => setShowRefund(false)} onSubmit={handleRefund} saleId={sale.id} salePrice={sale.soldPrice} />
      <ConfirmModal isOpen={showDelete} title="Delete Sale" message="Delete this sale? Item status will revert to available." confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
    </div>
  );
}
