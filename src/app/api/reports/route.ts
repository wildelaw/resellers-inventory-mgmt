import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { eq, and, gte, lte, sql, count, sum } from 'drizzle-orm';
import { withAuth, parseDateFilters } from '@/lib/api-utils';
import { canViewAllData } from '@/lib/auth-utils';
import { calculateProfit, calculateNetRevenue } from '@/lib/financial';
import { handleApiError } from '@/lib/api-errors';
import { PLATFORM_LABELS, ALL_PLATFORMS, type Platform } from '@/lib/constants';

// GET - Dashboard stats
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    try {
      const { searchParams } = new URL(req.url);
      const { startDate, endDate } = parseDateFilters(searchParams);

      const viewAll = canViewAllData(session);
      const userId = Number(session.user.id);

      // Build conditions based on RBAC
      const itemConditions = viewAll ? [] : [eq(items.ownerId, userId)];
      const saleConditions = viewAll ? [] : [eq(sales.soldBy, userId)];
      const mileageConditions = [eq(mileage.ownerId, userId)];

      // Add date filters
      if (startDate) {
        saleConditions.push(gte(sales.soldDate, startDate));
        itemConditions.push(gte(items.purchaseDate, startDate));
        mileageConditions.push(gte(mileage.date, startDate));
      }
      if (endDate) {
        saleConditions.push(lte(sales.soldDate, endDate));
        itemConditions.push(lte(items.purchaseDate, endDate));
        mileageConditions.push(lte(mileage.date, endDate));
      }

      // Fetch raw sales data for profit computation (SINGLE SOURCE OF TRUTH)
      const allSales = await db.query.sales.findMany({
        where: saleConditions.length > 0 ? and(...saleConditions) : undefined,
        with: { item: true },
      });

      // Compute profit using TypeScript function (SINGLE SOURCE OF TRUTH)
      const totalProfit = allSales.reduce((sumVal, sale) => {
        return sumVal + calculateProfit({
          soldPrice: sale.soldPrice,
          shippingCollected: sale.shippingCollected,
          salesTax: sale.salesTax,
          platformFees: sale.platformFees,
          refundAmount: sale.refundAmount,
          purchasePrice: sale.item?.purchasePrice ?? 0,
          shippingCost: sale.shippingCost,
        });
      }, 0);

      const totalNetRevenue = allSales.reduce((sumVal, sale) => {
        return sumVal + calculateNetRevenue({
          soldPrice: sale.soldPrice,
          shippingCollected: sale.shippingCollected,
          salesTax: sale.salesTax,
          platformFees: sale.platformFees,
          refundAmount: sale.refundAmount,
        });
      }, 0);

      const totalRevenue = allSales.reduce((s, sale) => s + sale.soldPrice, 0);
      const totalRefunds = allSales.reduce((s, sale) => s + (sale.refundAmount ?? 0), 0);
      const totalPlatformFees = allSales.reduce((s, sale) => s + (sale.platformFees ?? 0), 0);
      const totalShippingCost = allSales.reduce((s, sale) => s + (sale.shippingCost ?? 0), 0);

      // Inventory stats
      const itemWhere = itemConditions.length > 0 ? and(...itemConditions) : undefined;
      const itemStats = await db.select({
        total: count(),
        available: sql<number>`sum(CASE WHEN ${items.status} = 'available' THEN 1 ELSE 0 END)`,
        listed: sql<number>`sum(CASE WHEN ${items.status} = 'listed' THEN 1 ELSE 0 END)`,
        sold: sql<number>`sum(CASE WHEN ${items.status} = 'sold' THEN 1 ELSE 0 END)`,
        donated: sql<number>`sum(CASE WHEN ${items.status} = 'donated' THEN 1 ELSE 0 END)`,
        discarded: sql<number>`sum(CASE WHEN ${items.status} = 'discarded' THEN 1 ELSE 0 END)`,
        totalCost: sum(items.purchasePrice),
      }).from(items).where(itemWhere);

      // Sales by platform
      const salesByPlatform = ALL_PLATFORMS.map(platform => {
        const platformSales = allSales.filter(s => s.platform === platform);
        return {
          platform,
          platformLabel: PLATFORM_LABELS[platform as Platform],
          count: platformSales.length,
          revenue: platformSales.reduce((s, sale) => s + sale.soldPrice, 0),
          profit: platformSales.reduce((s, sale) => {
            return s + calculateProfit({
              soldPrice: sale.soldPrice,
              shippingCollected: sale.shippingCollected,
              salesTax: sale.salesTax,
              platformFees: sale.platformFees,
              refundAmount: sale.refundAmount,
              purchasePrice: sale.item?.purchasePrice ?? 0,
              shippingCost: sale.shippingCost,
            });
          }, 0),
        };
      }).filter(p => p.count > 0);

      // Monthly trends
      const monthlyTrends = await db.select({
        month: sql<string>`strftime('%Y-%m', ${sales.soldDate}, 'unixepoch')`,
        revenue: sum(sales.soldPrice),
        count: count(),
      }).from(sales)
        .where(saleConditions.length > 0 ? and(...saleConditions) : undefined)
        .groupBy(sql`strftime('%Y-%m', ${sales.soldDate}, 'unixepoch')`)
        .orderBy(sql`strftime('%Y-%m', ${sales.soldDate}, 'unixexec')`);

      // Mileage stats
      const mileageStats = await db.select({
        totalMiles: sum(mileage.miles),
        totalTrips: count(),
      }).from(mileage).where(and(...mileageConditions));

      return NextResponse.json({
        profit: {
          totalProfit,
          totalNetRevenue,
        },
        sales: {
          totalSales: allSales.length,
          totalRevenue,
          totalRefunds,
          totalPlatformFees,
          totalShippingCost,
          byPlatform: salesByPlatform,
          monthlyTrends: monthlyTrends.map((m: any) => ({
            month: m.month,
            revenue: Number(m.revenue ?? 0),
            count: Number(m.count ?? 0),
          })),
        },
        inventory: {
          total: Number(itemStats[0]?.total ?? 0),
          available: Number(itemStats[0]?.available ?? 0),
          listed: Number(itemStats[0]?.listed ?? 0),
          sold: Number(itemStats[0]?.sold ?? 0),
          donated: Number(itemStats[0]?.donated ?? 0),
          discarded: Number(itemStats[0]?.discarded ?? 0),
          totalCost: Number(itemStats[0]?.totalCost ?? 0),
        },
        mileage: {
          totalMiles: Number(mileageStats[0]?.totalMiles ?? 0),
          totalTrips: Number(mileageStats[0]?.totalTrips ?? 0),
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}