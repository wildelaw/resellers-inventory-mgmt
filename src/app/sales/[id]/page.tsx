import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { sales, items } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { canAccessResource } from '@/lib/auth-utils';
import { PLATFORM_LABELS } from '@/lib/constants';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';
import Header from '@/components/header';
import SaleDetailClient from './SaleDetailClient';

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id } = await params;
  const saleId = Number(id);

  const sale = await db.select().from(sales).where(eq(sales.id, saleId)).get();
  if (!sale) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sale Not Found</h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">The sale you are looking for does not exist.</p>
          </div>
        </main>
      </>
    );
  }

  // Check access
  if (!canAccessResource(sale.soldBy, Number(session.user.id), session, 'read')) {
    redirect('/sales');
  }

  // Get item details if linked
  let itemName: string | null = null;
  let purchasePrice = 0;
  if (sale.itemId) {
    const item = await db.select({ name: items.name, purchasePrice: items.purchasePrice }).from(items).where(eq(items.id, sale.itemId)).get();
    itemName = item?.name ?? null;
    purchasePrice = item?.purchasePrice ?? 0;
  }

  const profit = calculateProfit({
    soldPrice: sale.soldPrice,
    shippingCollected: sale.shippingCollected,
    salesTax: sale.salesTax,
    platformFees: sale.platformFees,
    refundAmount: sale.refundAmount,
    purchasePrice,
    shippingCost: sale.shippingCost,
  });

  const canEdit = canAccessResource(sale.soldBy, Number(session.user.id), session, 'write');

  return (
    <>
      <Header />
      <SaleDetailClient
        sale={sale}
        itemName={itemName}
        itemId={sale.itemId}
        profit={profit}
        canEdit={canEdit}
        platformLabels={PLATFORM_LABELS}
      />
    </>
  );
}