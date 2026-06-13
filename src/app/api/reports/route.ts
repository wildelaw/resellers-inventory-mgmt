import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { canViewAllData } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { calculateProfit, calculateNetRevenue } from '@/lib/financial';
import { eq, gte, lte, sql, and } from 'drizzle-orm';

export const GET = withAuth(async (req, ctx, session) => {
  const url = new URL(req.url);
  const userId = parseInt(session.user.id);

  const itemConditions = [];
  if (!canViewAllData(session)) itemConditions.push(eq(items.ownerId, userId));
  const saleConditions = [];
  if (!canViewAllData(session)) saleConditions.push(eq(sales.soldBy, userId));

  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  if (startDate) {
    saleConditions.push(gte(sales.soldDate, new Date(startDate)));
  }
  if (endDate) {
    saleConditions.push(lte(sales.soldDate, new Date(endDate)));
  }

  const whereItems = itemConditions.length > 0 ? and(...itemConditions) : undefined;
  const whereSales = saleConditions.length > 0 ? and(...saleConditions) : undefined;

  const [inventoryStats, allSales] = await Promise.all([
    db.select({
      total: sql<number>`count(*)`,
      available: sql<number>`sum(case when ${items.status} = 'available' then 1 else 0 end)`,
      listed: sql<number>`sum(case when ${items.status} = 'listed' then 1 else 0 end)`,
      sold: sql<number>`sum(case when ${items.status} = 'sold' then 1 else 0 end)`,
      totalValue: sql<number>`coalesce(sum(${items.purchasePrice}), 0)`,
    }).from(items).where(whereItems),
    db.query.sales.findMany({
      where: whereSales,
      with: { item: true },
    }),
  ]);

  const totalProfit = allSales.reduce((sum, sale) => {
    return sum + calculateProfit({
      soldPrice: sale.soldPrice,
      shippingCollected: sale.shippingCollected,
      salesTax: sale.salesTax,
      platformFees: sale.platformFees,
      refundAmount: sale.refundAmount,
      purchasePrice: (sale.item as any)?.purchasePrice ?? 0,
      shippingCost: sale.shippingCost,
    });
  }, 0);

  const totalRevenue = allSales.reduce((sum, sale) => {
    return sum + calculateNetRevenue({
      soldPrice: sale.soldPrice,
      shippingCollected: sale.shippingCollected,
      salesTax: sale.salesTax,
      platformFees: sale.platformFees,
      refundAmount: sale.refundAmount,
    });
  }, 0);

  const byPlatform: Record<string, { count: number; revenue: number; profit: number }> = {};
  for (const sale of allSales) {
    const platform = sale.platform || 'other';
    byPlatform[platform] = byPlatform[platform] || { count: 0, revenue: 0, profit: 0 };
    byPlatform[platform].count += 1;
    byPlatform[platform].revenue += sale.soldPrice + (sale.shippingCollected || 0) - (sale.salesTax || 0) - (sale.platformFees || 0);
    byPlatform[platform].profit += calculateProfit({
      soldPrice: sale.soldPrice,
      shippingCollected: sale.shippingCollected,
      salesTax: sale.salesTax,
      platformFees: sale.platformFees,
      refundAmount: sale.refundAmount,
      purchasePrice: (sale.item as any)?.purchasePrice ?? 0,
      shippingCost: sale.shippingCost,
    });
  }

  const monthlyTrends: Record<string, { revenue: number; profit: number; count: number }> = {};
  for (const sale of allSales) {
    const month = new Date(sale.soldDate as any).toISOString().slice(0, 7);
    monthlyTrends[month] = monthlyTrends[month] || { revenue: 0, profit: 0, count: 0 };
    monthlyTrends[month].revenue += sale.soldPrice + (sale.shippingCollected || 0);
    monthlyTrends[month].profit += calculateProfit({
      soldPrice: sale.soldPrice,
      shippingCollected: sale.shippingCollected,
      salesTax: sale.salesTax,
      platformFees: sale.platformFees,
      refundAmount: sale.refundAmount,
      purchasePrice: (sale.item as any)?.purchasePrice ?? 0,
      shippingCost: sale.shippingCost,
    });
    monthlyTrends[month].count += 1;
  }

  const stats = inventoryStats[0];

  return NextResponse.json({
    inventory: {
      total: Number(stats.total),
      available: Number(stats.available),
      listed: Number(stats.listed),
      sold: Number(stats.sold),
      totalValue: Number(stats.totalValue),
    },
    sales: {
      totalSales: allSales.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
    },
    profit: {
      totalProfit: Math.round(totalProfit * 100) / 100,
    },
    byPlatform,
    monthlyTrends,
  });
});