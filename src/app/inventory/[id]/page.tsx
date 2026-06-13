import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { items, sales, photos } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { canAccessResource } from '@/lib/auth-utils';
import { STATUS_LABELS, STATUS_COLORS, getAllowedTransitions } from '@/lib/constants';
import { formatCurrency, formatDate, formatDateTime, getPhotoUrl } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';
import Header from '@/components/header';
import ItemDetailClient from './ItemDetailClient';

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id } = await params;
  const itemId = Number(id);

  const item = await db.select().from(items).where(eq(items.id, itemId)).get();
  if (!item) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Item Not Found</h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">The item you are looking for does not exist.</p>
          </div>
        </main>
      </>
    );
  }

  // Check access
  if (!canAccessResource(item.ownerId, Number(session.user.id), session, 'read')) {
    redirect('/inventory');
  }

  // Fetch sales and photos
  const [itemSales, itemPhotos] = await Promise.all([
    db.select().from(sales).where(eq(sales.itemId, itemId)).orderBy(desc(sales.soldDate)).all(),
    db.select().from(photos).where(eq(photos.itemId, itemId)).all(),
  ]);

  const allowedTransitions = getAllowedTransitions(item.status as keyof typeof STATUS_LABELS);
  const canEdit = canAccessResource(item.ownerId, Number(session.user.id), session, 'write');

  // Calculate profit for each sale
  const salesWithProfit = itemSales.map((sale) => ({
    ...sale,
    profit: calculateProfit({
      soldPrice: sale.soldPrice,
      shippingCollected: sale.shippingCollected,
      salesTax: sale.salesTax,
      platformFees: sale.platformFees,
      refundAmount: sale.refundAmount,
      purchasePrice: item.purchasePrice,
      shippingCost: sale.shippingCost,
    }),
  }));

  return (
    <>
      <Header />
      <ItemDetailClient
        item={item}
        sales={salesWithProfit}
        photos={itemPhotos}
        allowedTransitions={allowedTransitions}
        canEdit={canEdit}
        statusLabels={STATUS_LABELS}
        statusColors={STATUS_COLORS}
      />
    </>
  );
}