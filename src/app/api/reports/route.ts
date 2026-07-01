import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { canViewAllData } from '@/lib/auth-utils';
import { calculateProfit, calculateNetRevenue } from '@/lib/financial';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { toTimestamp } from '@/lib/utils';
import { ALL_STATUSES, ALL_PLATFORMS } from '@/lib/constants';
import type { Session } from 'next-auth';

export const GET = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const viewAll = canViewAllData(session);
  const userId = parseInt(session.user.id, 10);

  // Build sales query
  const saleConditions = [];
  if (!viewAll) saleConditions.push(eq(sales.soldBy, userId));
  if (startDate) saleConditions.push(gte(sales.soldDate, toTimestamp(startDate)));
  if (endDate) saleConditions.push(lte(sales.soldDate, toTimestamp(endDate)));
  const saleWhere = saleConditions.length > 0 ? and(...saleConditions) : undefined;

  const allSales = await db.query.sales.findMany({
    where: saleWhere,
    with: { item: true },
  });

  // Build items query
  const itemConditions = [];
  if (!viewAll) itemConditions.push(eq(items.ownerId, userId));
  const itemWhere = itemConditions.length > 0 ? and(...itemConditions) : undefined;
  const allItems = await db.query.items.findMany({ where: itemWhere });

  // Compute profit using single source of truth
  let totalProfit = 0;
  let totalNetRevenue = 0;
  const salesByPlatform: Record<string, { count: number; revenue: number; profit: number }> = {};
  const monthlyTrends: Record<string, { revenue: number; profit: number; count: number }> = {};

  for (const sale of allSales) {
    const purchasePrice = sale.item?.purchasePrice ?? 0;
    const profit = calculateProfit({
      soldPrice: sale.soldPrice,
      shippingCollected: sale.shippingCollected,
      salesTax: sale.salesTax,
      platformFees: sale.platformFees,
      refundAmount: sale.refundAmount,
      purchasePrice,
      shippingCost: sale.shippingCost,
    });
    const netRevenue = calculateNetRevenue({
      soldPrice: sale.soldPrice,
      shippingCollected: sale.shippingCollected,
      salesTax: sale.salesTax,
      platformFees: sale.platformFees,
      refundAmount: sale.refundAmount,
    });

    totalProfit += profit;
    totalNetRevenue += netRevenue;

    // By platform
    const p = sale.platform;
    if (!salesByPlatform[p]) salesByPlatform[p] = { count: 0, revenue: 0, profit: 0 };
    salesByPlatform[p].count += 1;
    salesByPlatform[p].revenue += netRevenue;
    salesByPlatform[p].profit += profit;

    // Monthly trends
    const d = new Date(sale.soldDate * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyTrends[key]) monthlyTrends[key] = { revenue: 0, profit: 0, count: 0 };
    monthlyTrends[key].revenue += netRevenue;
    monthlyTrends[key].profit += profit;
    monthlyTrends[key].count += 1;
  }

  // Inventory stats
  const inventoryStats: Record<string, number> = {};
  for (const status of ALL_STATUSES) {
    inventoryStats[status] = allItems.filter((i) => i.status === status).length;
  }
  const totalInventoryValue = allItems
    .filter((i) => i.status === 'available' || i.status === 'listed')
    .reduce((sum, i) => sum + i.purchasePrice, 0);

  return NextResponse.json({
    profit: { totalProfit: Math.round(totalProfit * 100) / 100 },
    sales: {
      totalNetRevenue: Math.round(totalNetRevenue * 100) / 100,
      totalSales: allSales.length,
      salesByPlatform,
      monthlyTrends,
    },
    inventory: {
      ...inventoryStats,
      totalItems: allItems.length,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
    },
  });
});