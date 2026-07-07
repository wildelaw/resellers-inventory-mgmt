import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { withAuth } from '@/lib/api-utils';
import { canViewAllData, sessionUserId } from '@/lib/auth-utils';
import { calculateProfit, calculateNetRevenue } from '@/lib/financial';
import { PLATFORM_LABELS, ALL_PLATFORMS, type SalePlatform } from '@/lib/constants';

export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const sp = req.nextUrl.searchParams;
    const viewAll = canViewAllData(session);
    const uid = sessionUserId(session);

    const startTs = sp.get('startDate') ? Math.floor(new Date(sp.get('startDate')!).getTime() / 1000) : null;
    const endTs = sp.get('endDate') ? Math.floor(new Date(sp.get('endDate')!).getTime() / 1000) + 86400 : null;

    // Build sales query with item join for purchasePrice (needed by calculateProfit).
    const salesConditions = [];
    if (!viewAll) salesConditions.push(eq(sales.soldBy, uid));
    if (startTs && !isNaN(startTs)) salesConditions.push(gte(sales.soldDate, startTs));
    if (endTs && !isNaN(endTs)) salesConditions.push(lte(sales.soldDate, endTs));

    const saleRows = await db.query.sales.findMany({
      where: salesConditions.length > 0 ? and(...salesConditions) : undefined,
      with: { item: true },
    });

    // Compute profit using single source of truth (TypeScript only — no SQL formula).
    const enriched = saleRows.map((s) => ({
      ...s,
      purchasePrice: s.item?.purchasePrice ?? 0,
    }));

    const totalProfit = enriched.reduce((sum, s) => sum + calculateProfit(s), 0);
    const totalNetRevenue = enriched.reduce((sum, s) => sum + calculateNetRevenue(s), 0);
    const totalSales = enriched.length;
    const totalRevenue = enriched.reduce((sum, s) => sum + s.soldPrice, 0);

    // Sales by platform.
    const byPlatform: Record<string, { count: number; revenue: number; profit: number }> = {};
    for (const p of ALL_PLATFORMS) {
      byPlatform[p] = { count: 0, revenue: 0, profit: 0 };
    }
    for (const s of enriched) {
      const key = s.platform as SalePlatform;
      if (!byPlatform[key]) byPlatform[key] = { count: 0, revenue: 0, profit: 0 };
      byPlatform[key].count += 1;
      byPlatform[key].revenue += s.soldPrice;
      byPlatform[key].profit += calculateProfit(s);
    }

    // Monthly trends.
    const monthly: Record<string, { revenue: number; profit: number; count: number }> = {};
    for (const s of enriched) {
      const d = new Date(s.soldDate * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) monthly[key] = { revenue: 0, profit: 0, count: 0 };
      monthly[key].revenue += s.soldPrice;
      monthly[key].profit += calculateProfit(s);
      monthly[key].count += 1;
    }

    // Inventory stats.
    const itemConditions = [];
    if (!viewAll) itemConditions.push(eq(items.ownerId, uid));
    if (startTs && !isNaN(startTs)) itemConditions.push(gte(items.purchaseDate, startTs));
    if (endTs && !isNaN(endTs)) itemConditions.push(lte(items.purchaseDate, endTs));

    const itemRows = await db.query.items.findMany({
      where: itemConditions.length > 0 ? and(...itemConditions) : undefined,
    });

    const inventoryStats = {
      total: itemRows.length,
      available: itemRows.filter((i) => i.status === 'available').length,
      listed: itemRows.filter((i) => i.status === 'listed').length,
      sold: itemRows.filter((i) => i.status === 'sold').length,
      returned: itemRows.filter((i) => i.status === 'returned').length,
      donated: itemRows.filter((i) => i.status === 'donated').length,
      discarded: itemRows.filter((i) => i.status === 'discarded').length,
      totalInvestment: itemRows.reduce((s, i) => s + i.purchasePrice, 0),
    };

    return NextResponse.json({
      profit: { totalProfit },
      sales: { totalSales, totalRevenue, totalNetRevenue },
      byPlatform,
      monthly,
      inventory: inventoryStats,
    });
  })(req, { params: Promise.resolve({}) });
}
