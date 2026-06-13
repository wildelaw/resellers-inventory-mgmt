import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { sales, items } from '@/lib/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { canViewAllData } from '@/lib/auth-utils';
import { PLATFORM_LABELS } from '@/lib/constants';
import type { Platform } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';
import Header from '@/components/header';
import SalesClient from './SalesClient';

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const params = await searchParams;
  const viewAll = canViewAllData(session);
  const userId = Number(session.user.id);

  const platform = typeof params.platform === 'string' ? params.platform as Platform : undefined;
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  // Build conditions
  const conditions = [];
  if (!viewAll) {
    conditions.push(eq(sales.soldBy, userId));
  }
  if (platform) {
    conditions.push(eq(sales.platform, platform));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [salesList, countResult] = await Promise.all([
    db.select().from(sales).where(whereClause).orderBy(desc(sales.soldDate)).limit(pageSize).offset(offset).all(),
    db.select({ count: sql<number>`count(*)` }).from(sales).where(whereClause).get(),
  ]);

  const total = countResult?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Enrich sales with item names and profit
  const enrichedSales = await Promise.all(salesList.map(async (sale) => {
    let itemName: string | null = null;
    let purchasePrice = 0;
    if (sale.itemId) {
      const item = await db.select({ name: items.name, purchasePrice: items.purchasePrice }).from(items).where(eq(items.id, sale.itemId)).get();
      itemName = item?.name ?? null;
      purchasePrice = item?.purchasePrice ?? 0;
    }
    return {
      ...sale,
      itemName,
      profit: calculateProfit({
        soldPrice: sale.soldPrice,
        shippingCollected: sale.shippingCollected,
        salesTax: sale.salesTax,
        platformFees: sale.platformFees,
        refundAmount: sale.refundAmount,
        purchasePrice,
        shippingCost: sale.shippingCost,
      }),
    };
  }));

  return (
    <>
      <Header />
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <SalesClient
          initialSales={enrichedSales}
          pagination={{ page, pageSize, total, totalPages }}
          platformFilter={platform}
          platformLabels={PLATFORM_LABELS}
        />
      </Suspense>
    </>
  );
}