import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { withAuth, parseDateRange } from '@/lib/api-utils';
import { canViewAllData, sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { calculateProfit, calculateNetRevenue } from '@/lib/financial';
import type { Sale } from '@/lib/schema';

// GET /api/reports — dashboard stats. Profit is computed in TypeScript via
// calculateProfit() (single source of truth) — there is no SQL formula.
export const GET = withAuth(async (req, ctx, session) => {
  const { startDate, endDate } = parseDateRange(req.nextUrl.searchParams);
  const userId = sessionUserId(session);
  const seesAll = canViewAllData(session);

  const itemConditions = [];
  const saleConditions = [];
  if (!seesAll) {
    itemConditions.push(eq(items.ownerId, userId));
    saleConditions.push(eq(sales.soldBy, userId));
  }
  if (startDate) {
    itemConditions.push(gte(items.purchaseDate, startDate));
    saleConditions.push(gte(sales.soldDate, startDate));
  }
  if (endDate) {
    itemConditions.push(lte(items.purchaseDate, endDate));
    saleConditions.push(lte(sales.soldDate, endDate));
  }

  const [inventoryStats, saleRows, byPlatform, monthly] = await Promise.all([
    db
      .select({
        status: items.status,
        count: sql<number>`count(*)`,
        totalCost: sql<number>`coalesce(sum(${items.purchasePrice}), 0)`,
      })
      .from(items)
      .where(itemConditions.length > 0 ? and(...itemConditions) : undefined)
      .groupBy(items.status),
    db.query.sales.findMany({
      where: saleConditions.length > 0 ? and(...saleConditions) : undefined,
      with: { item: { columns: { purchasePrice: true } } },
    }),
    db
      .select({
        platform: sales.platform,
        count: sql<number>`count(*)`,
        totalRevenue: sql<number>`coalesce(sum(${sales.soldPrice} + coalesce(${sales.shippingCollected}, 0)), 0)`,
      })
      .from(sales)
      .where(saleConditions.length > 0 ? and(...saleConditions) : undefined)
      .groupBy(sales.platform),
    db
      .select({
        month: sql<string>`strftime('%Y-%m', ${sales.soldDate} / 1000, 'unixepoch')`,
        revenue: sql<number>`coalesce(sum(${sales.soldPrice} + coalesce(${sales.shippingCollected}, 0)), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(sales)
      .where(saleConditions.length > 0 ? and(...saleConditions) : undefined)
      .groupBy(sql`strftime('%Y-%m', ${sales.soldDate} / 1000, 'unixepoch')`)
      .orderBy(sql`strftime('%Y-%m', ${sales.soldDate} / 1000, 'unixepoch')`),
  ]);

  // Aggregate profit/revenue in TypeScript using the single-source functions
  const salesWithPurchase = saleRows.filter((s) => s.item != null) as (Sale & { item: { purchasePrice: number } })[];
  const totalProfit = salesWithPurchase.reduce((sum, s) => sum + calculateProfit({ ...s, purchasePrice: s.item.purchasePrice }), 0);
  const totalNetRevenue = salesWithPurchase.reduce((sum, s) => sum + calculateNetRevenue(s), 0);
  const totalRevenue = saleRows.reduce((sum, s) => sum + s.soldPrice + (s.shippingCollected || 0), 0);
  const totalRefunds = saleRows.reduce((sum, s) => sum + (s.refundAmount || 0), 0);
  const totalCosts = salesWithPurchase.reduce((sum, s) => sum + s.item.purchasePrice, 0);

  const inventory = {
    totalItems: 0,
    totalCost: 0,
    byStatus: {} as Record<string, number>,
  };
  for (const row of inventoryStats) {
    inventory.totalItems += Number(row.count);
    inventory.totalCost += Number(row.totalCost);
    inventory.byStatus[row.status] = Number(row.count);
  }

  return NextResponse.json({
    inventory,
    sales: {
      count: saleRows.length,
      totalRevenue,
      totalNetRevenue,
      totalProfit,
      totalCosts,
      totalRefunds,
      averageProfit: salesWithPurchase.length > 0 ? totalProfit / salesWithPurchase.length : 0,
    },
    byPlatform: byPlatform.map((r) => ({
      platform: r.platform,
      count: Number(r.count),
      totalRevenue: Number(r.totalRevenue),
    })),
    monthly: monthly.map((r) => ({
      month: r.month,
      revenue: Number(r.revenue),
      count: Number(r.count),
    })),
  });
});