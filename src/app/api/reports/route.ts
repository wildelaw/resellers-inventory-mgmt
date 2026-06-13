import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { canViewAllData } from '@/lib/auth-utils';
import { calculateProfit } from '@/lib/financial';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { parseDateParam } from '@/lib/utils';
import type { Item } from '@/lib/schema';

export const GET = withAuth(async (req, _ctx, session) => {
  const { searchParams } = new URL(req.url);
  const viewAll = canViewAllData(session);

  // Inventory stats
  const itemConditions = [];
  if (!viewAll) {
    itemConditions.push(eq(items.ownerId, Number(session.user.id)));
  }
  const itemWhereClause = itemConditions.length > 0 ? and(...itemConditions) : undefined;

  const inventoryStats = await db.select({
    total: sql<number>`count(*)`,
    available: sql<number>`sum(case when ${items.status} = 'available' then 1 else 0 end)`,
    listed: sql<number>`sum(case when ${items.status} = 'listed' then 1 else 0 end)`,
    sold: sql<number>`sum(case when ${items.status} = 'sold' then 1 else 0 end)`,
    returned: sql<number>`sum(case when ${items.status} = 'returned' then 1 else 0 end)`,
    donated: sql<number>`sum(case when ${items.status} = 'donated' then 1 else 0 end)`,
    discarded: sql<number>`sum(case when ${items.status} = 'discarded' then 1 else 0 end)`,
    totalValue: sql<number>`coalesce(sum(${items.purchasePrice}), 0)`,
  }).from(items).where(itemWhereClause).get();

  // Sales stats
  const saleConditions = [];
  if (!viewAll) {
    saleConditions.push(eq(sales.soldBy, Number(session.user.id)));
  }
  const dateFrom = parseDateParam(searchParams.get('dateFrom'));
  const dateTo = parseDateParam(searchParams.get('dateTo'));
  if (dateFrom !== null) {
    saleConditions.push(gte(sales.soldDate, dateFrom));
  }
  if (dateTo !== null) {
    saleConditions.push(lte(sales.soldDate, dateTo));
  }

  const saleWhereClause = saleConditions.length > 0 ? and(...saleConditions) : undefined;

  const salesData = await db.select().from(sales).where(saleWhereClause).orderBy(desc(sales.soldDate)).all();

  // Fetch all items for purchase price lookup
  const allItems = await db.select().from(items).all();
  const itemMap = new Map<number, Item>(allItems.map(i => [i.id, i]));

  // Compute profit using calculateProfit for each sale
  let totalProfit = 0;
  let totalRevenue = 0;
  const byPlatform: Record<string, { count: number; revenue: number; profit: number }> = {};
  const monthlyTrends: Record<string, { count: number; revenue: number; profit: number }> = {};

  for (const sale of salesData) {
    const item = sale.itemId ? itemMap.get(sale.itemId) : null;
    const purchasePrice = item?.purchasePrice ?? 0;
    const profit = calculateProfit({ ...sale, purchasePrice });
    const revenue = sale.soldPrice + (sale.shippingCollected ?? 0);

    totalProfit += profit;
    totalRevenue += revenue;

    // By platform
    const platform = sale.platform || 'other';
    if (!byPlatform[platform]) {
      byPlatform[platform] = { count: 0, revenue: 0, profit: 0 };
    }
    byPlatform[platform].count += 1;
    byPlatform[platform].revenue += revenue;
    byPlatform[platform].profit += profit;

    // Monthly trends
    const date = new Date(sale.soldDate * 1000);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyTrends[monthKey]) {
      monthlyTrends[monthKey] = { count: 0, revenue: 0, profit: 0 };
    }
    monthlyTrends[monthKey].count += 1;
    monthlyTrends[monthKey].revenue += revenue;
    monthlyTrends[monthKey].profit += profit;
  }

  return NextResponse.json({
    inventory: inventoryStats ?? { total: 0, available: 0, listed: 0, sold: 0, returned: 0, donated: 0, discarded: 0, totalValue: 0 },
    sales: {
      total: salesData.length,
      totalRevenue,
      totalProfit,
    },
    byPlatform,
    monthlyTrends,
  });
});