import { NextRequest, NextResponse } from 'next/server';
import { withAuth, parseDateRange } from '@/lib/api-utils';
import { canViewAllData } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { calculateProfit, calculateNetRevenue } from '@/lib/financial';
import { handleApiError } from '@/lib/api-errors';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * GET /api/reports
 * Get dashboard statistics and reports
 * SINGLE SOURCE OF TRUTH: Profit computed in TypeScript using calculateProfit()
 */
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const { searchParams } = new URL(req.url);
    const { startDate, endDate } = parseDateRange(searchParams);

    // Build where conditions for RBAC
    const userCondition = canViewAllData(session)
      ? undefined
      : eq(items.ownerId, parseInt(session.user.id));

    const salesUserCondition = canViewAllData(session)
      ? undefined
      : eq(sales.soldBy, parseInt(session.user.id));

    // Inventory stats
    const inventoryStats = await db
      .select({
        status: items.status,
        count: sql<number>`count(*)`,
        totalValue: sql<number>`sum(${items.purchasePrice})`,
      })
      .from(items)
      .where(userCondition)
      .groupBy(items.status);

    // Sales data with date filtering
    const salesConditions = [];
    if (salesUserCondition) salesConditions.push(salesUserCondition);
    if (startDate) salesConditions.push(gte(sales.soldDate, startDate));
    if (endDate) salesConditions.push(lte(sales.soldDate, endDate));

    const salesWhereClause = salesConditions.length > 0 ? and(...salesConditions) : undefined;

    // Fetch raw sales data with item info
    const salesData = await db.query.sales.findMany({
      where: salesWhereClause,
      with: {
        item: {
          columns: {
            purchasePrice: true,
          },
        },
      },
    });

    // Compute profit using TypeScript function (SINGLE SOURCE OF TRUTH)
    let totalProfit = 0;
    let totalNetRevenue = 0;
    let totalSales = 0;
    let totalRefunds = 0;

    for (const sale of salesData) {
      if (sale.item) {
        const profit = calculateProfit({
          soldPrice: sale.soldPrice,
          shippingCollected: sale.shippingCollected,
          salesTax: sale.salesTax,
          platformFees: sale.platformFees,
          refundAmount: sale.refundAmount,
          purchasePrice: sale.item.purchasePrice,
          shippingCost: sale.shippingCost,
        });
        totalProfit += profit;
      }

      const netRevenue = calculateNetRevenue({
        soldPrice: sale.soldPrice,
        shippingCollected: sale.shippingCollected,
        salesTax: sale.salesTax,
        platformFees: sale.platformFees,
        refundAmount: sale.refundAmount,
      });
      totalNetRevenue += netRevenue;
      totalSales += 1;
      
      if (sale.refundAmount > 0) {
        totalRefunds += 1;
      }
    }

    // Sales by platform
    const salesByPlatform = await db
      .select({
        platform: sales.platform,
        count: sql<number>`count(*)`,
        totalRevenue: sql<number>`sum(${sales.soldPrice})`,
      })
      .from(sales)
      .where(salesWhereClause)
      .groupBy(sales.platform);

    // Monthly trends (last 12 months)
    const monthlyTrends = await db
      .select({
        month: sql<string>`strftime('%Y-%m', ${sales.soldDate} / 1000, 'unixepoch')`,
        salesCount: sql<number>`count(*)`,
        revenue: sql<number>`sum(${sales.soldPrice})`,
      })
      .from(sales)
      .where(salesWhereClause)
      .groupBy(sql`strftime('%Y-%m', ${sales.soldDate} / 1000, 'unixepoch')`)
      .orderBy(sql`strftime('%Y-%m', ${sales.soldDate} / 1000, 'unixepoch') DESC`)
      .limit(12);

    return NextResponse.json({
      inventory: {
        byStatus: inventoryStats.map(s => ({
          status: s.status,
          count: s.count,
          totalValue: s.totalValue || 0,
        })),
      },
      sales: {
        totalSales,
        totalNetRevenue,
        totalRefunds,
        byPlatform: salesByPlatform.map(p => ({
          platform: p.platform,
          count: p.count,
          totalRevenue: p.totalRevenue || 0,
        })),
      },
      profit: {
        totalProfit,
      },
      trends: {
        monthly: monthlyTrends.map(t => ({
          month: t.month,
          salesCount: t.salesCount,
          revenue: t.revenue || 0,
        })),
      },
    });
  })(req);
}
