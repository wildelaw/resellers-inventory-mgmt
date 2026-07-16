import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { withAuth } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { items, sales } from "@/lib/schema";
import { canViewAllData } from "@/lib/auth-utils";
import { calculateProfit, calculateNetRevenue, type ProfitInput } from "@/lib/financial";

export const GET = withAuth(async (req, _ctx, session) => {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const itemFilters = [] as ReturnType<typeof eq>[];
  const saleFilters = [] as ReturnType<typeof eq>[];
  if (!canViewAllData(session)) {
    const uid = Number(session.user.id);
    itemFilters.push(eq(items.ownerId, uid));
    saleFilters.push(eq(sales.soldBy, uid));
  }

  const startDate = sp.get("startDate");
  if (startDate) {
    const t = Math.floor(new Date(startDate).getTime() / 1000);
    if (!isNaN(t)) {
      saleFilters.push(gte(sales.soldDate, t));
      itemFilters.push(gte(items.purchaseDate, t));
    }
  }
  const endDate = sp.get("endDate");
  if (endDate) {
    const t = Math.floor(new Date(endDate).getTime() / 1000);
    if (!isNaN(t)) {
      saleFilters.push(lte(sales.soldDate, t));
      itemFilters.push(lte(items.purchaseDate, t));
    }
  }

  const itemWhere = itemFilters.length ? and(...itemFilters) : undefined;
  const saleWhere = saleFilters.length ? and(...saleFilters) : undefined;

  const inventoryRows = await db
    .select({
      total: sql<number>`count(*)`,
      available: sql<number>`SUM(CASE WHEN status='available' THEN 1 ELSE 0 END)`,
      listed: sql<number>`SUM(CASE WHEN status='listed' THEN 1 ELSE 0 END)`,
      sold: sql<number>`SUM(CASE WHEN status='sold' THEN 1 ELSE 0 END)`,
      invested: sql<number>`COALESCE(SUM(purchase_price), 0)`,
    })
    .from(items)
    .where(itemWhere);
  const inv = inventoryRows[0];

  const joined = await db
    .select({
      sale: sales,
      item: items,
    })
    .from(sales)
    .leftJoin(items, eq(sales.itemId, items.id))
    .where(saleWhere);

  let totalProfit = 0;
  let totalRevenue = 0;
  let totalSales = 0;
  let totalRefunds = 0;
  const platformMap = new Map<string, { count: number; revenue: number }>();
  const monthMap = new Map<string, { revenue: number; profit: number; count: number }>();

  for (const row of joined) {
    totalSales++;
    const purchasePrice = row.item?.purchasePrice ?? 0;
    const input: ProfitInput = {
      soldPrice: row.sale.soldPrice,
      shippingCollected: row.sale.shippingCollected ?? 0,
      salesTax: row.sale.salesTax ?? 0,
      platformFees: row.sale.platformFees ?? 0,
      refundAmount: row.sale.refundAmount ?? 0,
      purchasePrice,
      shippingCost: row.sale.shippingCost ?? 0,
    };
    const profit = calculateProfit(input);
    const revenue = calculateNetRevenue(input);
    totalProfit += profit;
    totalRevenue += revenue;
    totalRefunds += input.refundAmount ?? 0;

    const platform = row.sale.platform;
    const p = platformMap.get(platform) ?? { count: 0, revenue: 0 };
    p.count++;
    p.revenue += row.sale.soldPrice;
    platformMap.set(platform, p);

    const d = new Date(row.sale.soldDate * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = monthMap.get(key) ?? { revenue: 0, profit: 0, count: 0 };
    m.revenue += revenue;
    m.profit += profit;
    m.count++;
    monthMap.set(key, m);
  }

  return NextResponse.json({
    inventory: {
      total: Number(inv?.total ?? 0),
      available: Number(inv?.available ?? 0),
      listed: Number(inv?.listed ?? 0),
      sold: Number(inv?.sold ?? 0),
      invested: Number(inv?.invested ?? 0),
    },
    sales: {
      count: totalSales,
      totalRevenue,
      totalRefunds,
      averageSale: totalSales > 0 ? totalRevenue / totalSales : 0,
    },
    profit: {
      totalProfit,
      averageProfit: totalSales > 0 ? totalProfit / totalSales : 0,
    },
    salesByPlatform: Array.from(platformMap.entries()).map(([platform, v]) => ({
      platform,
      count: v.count,
      revenue: v.revenue,
    })),
    monthlyTrend: Array.from(monthMap.entries())
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  });
});
