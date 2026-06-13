import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { canViewAllData } from '@/lib/auth-utils';
import { calculateProfit, calculateNetRevenue } from '@/lib/financial';
import { eq, gte, lte, and, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  return withAuth(req, async (session) => {
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');
    const ownerId = canViewAllData(session) ? undefined : session.user.id;
    const conditions = [];
    if (ownerId) conditions.push(eq(sales.soldBy, ownerId));
    if (startDate) conditions.push(gte(sales.soldDate, Math.floor(new Date(startDate).getTime() / 1000)));
    if (endDate) conditions.push(lte(sales.soldDate, Math.floor(new Date(endDate).getTime() / 1000)));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const saleRows = await db.query.sales.findMany({ where, with: { item: true } });
    let totalProfit = 0, totalNetRevenue = 0, totalSoldPrice = 0;
    for (const sale of saleRows) {
      const pi = { soldPrice: sale.soldPrice, purchasePrice: (sale.item as any)?.purchasePrice ?? 0, shippingCost: sale.shippingCost, shippingCollected: sale.shippingCollected, salesTax: sale.salesTax, platformFees: sale.platformFees, refundAmount: sale.refundAmount };
      totalProfit += calculateProfit(pi);
      totalNetRevenue += calculateNetRevenue(pi);
      totalSoldPrice += sale.soldPrice;
    }
    const inventoryStats = await db.select({ status: items.status, count: sql<number>`count(*)` }).from(items).where(ownerId ? eq(items.ownerId, ownerId) : undefined).groupBy(items.status);
    const inventoryByStatus: Record<string, number> = {};
    let totalItems = 0;
    for (const row of inventoryStats) { inventoryByStatus[row.status] = row.count; totalItems += row.count; }
    return NextResponse.json({ profit: { totalProfit: Math.round(totalProfit * 100) / 100, totalNetRevenue: Math.round(totalNetRevenue * 100) / 100 }, sales: { totalSoldPrice, count: saleRows.length }, inventory: { total: totalItems, byStatus: inventoryByStatus } });
  });
}
