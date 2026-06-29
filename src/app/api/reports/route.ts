import { NextResponse } from 'next/server';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { withAuth } from '@/lib/api-utils';
import { canViewAllData, currentUserId } from '@/lib/auth-utils';
import { calculateProfit, calculateNetRevenue, calculateGrossRevenue } from '@/lib/financial';
import { ALL_STATUSES, PLATFORMS } from '@/lib/constants';
import type { ItemStatus, Platform } from '@/lib/constants';

export const GET = withAuth(async (req, _ctx, session) => {
  const sp = req.nextUrl.searchParams;
  const startTs = sp.get('startDate') ? new Date(sp.get('startDate') as string).getTime() / 1000 : null;
  const endTs = sp.get('endDate') ? new Date(sp.get('endDate') as string).getTime() / 1000 : null;

  const uid = currentUserId(session);
  const viewAll = canViewAllData(session);

  // ---- Inventory stats ----
  const invWhere = viewAll ? undefined : eq(items.ownerId, uid);
  const invRows = db.select({ status: items.status }).from(items).where(invWhere).all();
  const inventoryByStatus: Record<string, number> = {};
  for (const s of ALL_STATUSES) inventoryByStatus[s] = 0;
  for (const r of invRows) inventoryByStatus[r.status as ItemStatus] = (inventoryByStatus[r.status as ItemStatus] ?? 0) + 1;

  const invValueRow = db.select({
    total: sql<number>`COALESCE(SUM(${items.purchasePrice}), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(items).where(invWhere).get();
  const inventoryValue = Number(invValueRow?.total ?? 0);
  const inventoryCount = Number(invValueRow?.count ?? 0);

  // ---- Sales (raw) with item relation for purchasePrice ----
  const saleConditions = [];
  if (!viewAll) saleConditions.push(eq(sales.soldBy, uid));
  if (startTs) saleConditions.push(gte(sales.soldDate, Math.floor(startTs)));
  if (endTs) saleConditions.push(lte(sales.soldDate, Math.floor(endTs)));
  const saleWhere = saleConditions.length ? and(...saleConditions) : undefined;

  const saleRows = db.query.sales.findMany({
    where: saleWhere,
    with: { item: true },
  }).sync();

  // Single source of truth: compute profit per sale via financial.ts.
  const profitInputs = saleRows.map((s) => ({
    soldPrice: Number(s.soldPrice),
    shippingCollected: s.shippingCollected == null ? 0 : Number(s.shippingCollected),
    salesTax: s.salesTax == null ? 0 : Number(s.salesTax),
    platformFees: s.platformFees == null ? 0 : Number(s.platformFees),
    refundAmount: s.refundAmount == null ? 0 : Number(s.refundAmount),
    purchasePrice: s.item ? Number(s.item.purchasePrice) : 0,
    shippingCost: s.shippingCost == null ? 0 : Number(s.shippingCost),
  }));

  const totalProfit = profitInputs.reduce((sum, p) => sum + calculateProfit(p), 0);
  const totalNetRevenue = profitInputs.reduce((sum, p) => sum + calculateNetRevenue(p), 0);
  const totalGrossRevenue = profitInputs.reduce((sum, p) => sum + calculateGrossRevenue(p), 0);
  const totalCost = profitInputs.reduce(
    (sum, p) => sum + (p.purchasePrice + p.shippingCost),
    0,
  );
  const totalRefunds = saleRows.reduce((s, r) => s + Number(r.refundAmount ?? 0), 0);

  // Sales by platform
  const salesByPlatform: Record<string, { count: number; revenue: number; profit: number }> = {};
  for (const p of PLATFORMS) salesByPlatform[p] = { count: 0, revenue: 0, profit: 0 };
  saleRows.forEach((s, i) => {
    const plat = s.platform as Platform;
    const bucket = salesByPlatform[plat] ?? (salesByPlatform[plat] = { count: 0, revenue: 0, profit: 0 });
    bucket.count += 1;
    bucket.revenue += Number(s.soldPrice) + Number(s.shippingCollected ?? 0);
    bucket.profit += calculateProfit(profitInputs[i]);
  });

  // Monthly trend (by sold month)
  const monthly = new Map<string, { month: string; revenue: number; profit: number; count: number }>();
  saleRows.forEach((s, i) => {
    const d = new Date(s.soldDate * 1000);
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const cur = monthly.get(month) ?? { month, revenue: 0, profit: 0, count: 0 };
    cur.revenue += Number(s.soldPrice) + Number(s.shippingCollected ?? 0);
    cur.profit += calculateProfit(profitInputs[i]);
    cur.count += 1;
    monthly.set(month, cur);
  });

  // ---- Mileage (own only; admin/canViewAll see all) ----
  const mileWhere = viewAll ? undefined : eq(mileage.ownerId, uid);
  const mileRows = db.select({ miles: mileage.miles }).from(mileage).where(mileWhere).all();
  const totalMiles = mileRows.reduce((s, r) => s + Number(r.miles), 0);

  return NextResponse.json({
    inventory: {
      count: inventoryCount,
      value: inventoryValue,
      byStatus: inventoryByStatus,
    },
    sales: {
      count: saleRows.length,
      totalGrossRevenue,
      totalNetRevenue,
      totalCost,
      totalRefunds,
      totalProfit,
      byPlatform: Object.fromEntries(
        Object.entries(salesByPlatform).filter(([, v]) => v.count > 0),
      ),
      monthlyTrend: Array.from(monthly.values()).sort((a, b) => a.month.localeCompare(b.month)),
    },
    mileage: { totalMiles, trips: mileRows.length },
  });
});