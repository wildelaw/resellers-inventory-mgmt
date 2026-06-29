import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { withAuth } from '@/lib/api-utils';
import { canViewAllData } from '@/lib/auth-utils';
import { dateParamToTimestamp } from '@/lib/utils';
import { calculateProfit, calculateNetRevenue } from '@/lib/financial';
import type { Session } from 'next-auth';

export const dynamic = 'force-dynamic';

// GET /api/reports — dashboard stats (TypeScript profit computation)
export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const sp = req.nextUrl.searchParams;
    const startDate = dateParamToTimestamp(sp.get('startDate'));
    const endDate = dateParamToTimestamp(sp.get('endDate'));

    // ----- inventory stats -----
    const itemWhere = canViewAllData(session)
      ? undefined
      : eq(items.ownerId, Number(session.user.id));

    const itemRows = itemWhere
      ? db.select().from(items).where(itemWhere).all()
      : db.select().from(items).all();

    const inventoryStats = {
      total: itemRows.length,
      available: itemRows.filter((i) => i.status === 'available').length,
      listed: itemRows.filter((i) => i.status === 'listed').length,
      sold: itemRows.filter((i) => i.status === 'sold').length,
      returned: itemRows.filter((i) => i.status === 'returned').length,
      donated: itemRows.filter((i) => i.status === 'donated').length,
      discarded: itemRows.filter((i) => i.status === 'discarded').length,
      totalInvested: itemRows.reduce((s, i) => s + i.purchasePrice, 0),
    };

    // ----- sales stats (with profit computed in TS) -----
    const saleConditions = [];
    if (!canViewAllData(session)) {
      saleConditions.push(eq(sales.soldBy, Number(session.user.id)));
    }
    if (startDate !== null) saleConditions.push(gte(sales.soldDate, startDate));
    if (endDate !== null) saleConditions.push(lte(sales.soldDate, endDate));
    const saleWhere = saleConditions.length > 0 ? and(...saleConditions) : undefined;

    const saleRows = saleWhere
      ? db.select().from(sales).where(saleWhere).all()
      : db.select().from(sales).all();

    // Build a map of item purchase prices for profit computation
    const itemIdToPurchase = new Map<number, number>();
    for (const item of itemRows) itemIdToPurchase.set(item.id, item.purchasePrice);

    let totalProfit = 0;
    let totalNetRevenue = 0;
    let totalSoldPrice = 0;
    let totalShippingCollected = 0;
    let totalSalesTax = 0;
    let totalPlatformFees = 0;
    let totalRefundAmount = 0;
    let totalShippingCost = 0;
    const platformBreakdown: Record<string, { count: number; revenue: number; profit: number }> = {};
    const monthlyTrend: Record<string, { revenue: number; profit: number; count: number }> = {};

    for (const sale of saleRows) {
      const purchasePrice = sale.itemId ? (itemIdToPurchase.get(sale.itemId) ?? 0) : 0;
      const profitInput = {
        soldPrice: sale.soldPrice,
        shippingCollected: sale.shippingCollected,
        salesTax: sale.salesTax,
        platformFees: sale.platformFees,
        refundAmount: sale.refundAmount,
        shippingCost: sale.shippingCost,
        purchasePrice,
      };
      const profit = calculateProfit(profitInput);
      const netRev = calculateNetRevenue({
        soldPrice: sale.soldPrice,
        shippingCollected: sale.shippingCollected,
        refundAmount: sale.refundAmount,
      });
      totalProfit += profit;
      totalNetRevenue += netRev;
      totalSoldPrice += sale.soldPrice;
      totalShippingCollected += sale.shippingCollected ?? 0;
      totalSalesTax += sale.salesTax ?? 0;
      totalPlatformFees += sale.platformFees ?? 0;
      totalRefundAmount += sale.refundAmount ?? 0;
      totalShippingCost += sale.shippingCost ?? 0;

      const plat = sale.platform;
      platformBreakdown[plat] ??= { count: 0, revenue: 0, profit: 0 };
      platformBreakdown[plat].count += 1;
      platformBreakdown[plat].revenue += netRev;
      platformBreakdown[plat].profit += profit;

      const d = new Date(sale.soldDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrend[key] ??= { revenue: 0, profit: 0, count: 0 };
      monthlyTrend[key].revenue += netRev;
      monthlyTrend[key].profit += profit;
      monthlyTrend[key].count += 1;
    }

    // ----- mileage stats -----
    const mileageWhere = eq(mileage.ownerId, Number(session.user.id));
    const mileageRows = db.select().from(mileage).where(mileageWhere).all();
    const totalMiles = mileageRows.reduce((s, r) => s + r.miles, 0);

    return NextResponse.json({
      inventory: inventoryStats,
      sales: {
        count: saleRows.length,
        totalSoldPrice,
        totalShippingCollected,
        totalSalesTax,
        totalPlatformFees,
        totalRefundAmount,
        totalShippingCost,
        totalNetRevenue,
        totalProfit,
      },
      platformBreakdown,
      monthlyTrend,
      mileage: { totalMiles, totalTrips: mileageRows.length },
    });
  })(req, { params: Promise.resolve({}) });
}