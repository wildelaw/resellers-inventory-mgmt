import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items, sales, appConfig } from "@/lib/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { canViewAllData } from "@/lib/auth-utils";
import { calculateProfit, calculateNetRevenue, type ProfitInput } from "@/lib/financial";
import { formatCurrency } from "@/lib/utils";
import { PLATFORM_LABELS, type Platform } from "@/lib/constants";
import Header from "@/components/header";

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sp = await searchParams;
  const ownerId = Number(session.user.id);
  const isViewAll = canViewAllData(session);

  const startDate = sp.startDate
    ? Math.floor(new Date(String(sp.startDate)).getTime() / 1000)
    : null;
  const endDate = sp.endDate
    ? Math.floor(new Date(String(sp.endDate)).getTime() / 1000)
    : null;

  const itemFilters = [] as ReturnType<typeof eq>[];
  const saleFilters = [] as ReturnType<typeof eq>[];
  if (!isViewAll) {
    itemFilters.push(eq(items.ownerId, ownerId));
    saleFilters.push(eq(sales.soldBy, ownerId));
  }
  if (startDate) {
    itemFilters.push(gte(items.purchaseDate, startDate));
    saleFilters.push(gte(sales.soldDate, startDate));
  }
  if (endDate) {
    itemFilters.push(lte(items.purchaseDate, endDate));
    saleFilters.push(lte(sales.soldDate, endDate));
  }

  const itemWhere = itemFilters.length ? and(...itemFilters) : undefined;
  const saleWhere = saleFilters.length ? and(...saleFilters) : undefined;

  const invAgg = await db
    .select({
      total: sql<number>`count(*)`,
      invested: sql<number>`COALESCE(SUM(purchase_price), 0)`,
    })
    .from(items)
    .where(itemWhere);

  const salesData = await db
    .select({ sale: sales, item: items })
    .from(sales)
    .leftJoin(items, eq(sales.itemId, items.id))
    .where(saleWhere);

  let totalProfit = 0;
  let totalRevenue = 0;
  let totalRefunds = 0;
  const platformMap = new Map<string, { count: number; revenue: number; profit: number }>();
  const monthMap = new Map<string, { revenue: number; profit: number; count: number }>();

  for (const row of salesData) {
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

    const p = platformMap.get(row.sale.platform) ?? { count: 0, revenue: 0, profit: 0 };
    p.count++;
    p.revenue += row.sale.soldPrice;
    p.profit += profit;
    platformMap.set(row.sale.platform, p);

    const d = new Date(row.sale.soldDate * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = monthMap.get(key) ?? { revenue: 0, profit: 0, count: 0 };
    m.revenue += revenue;
    m.profit += profit;
    m.count++;
    monthMap.set(key, m);
  }

  const settings = await db.query.appConfig.findFirst();
  const taxRate = settings?.salesTaxRate ?? 0.0825;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Reports</h1>

        <form className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3">
          <input
            type="date"
            name="startDate"
            defaultValue={String(sp.startDate || "")}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 text-sm"
          />
          <input
            type="date"
            name="endDate"
            defaultValue={String(sp.endDate || "")}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 text-sm"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
            Apply
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Stat label="Total Sales" value={String(salesData.length)} />
          <Stat label="Total Revenue" value={formatCurrency(totalRevenue)} />
          <Stat label="Total Profit" value={formatCurrency(totalProfit)} highlight />
          <Stat label="Total Refunds" value={formatCurrency(totalRefunds)} />
          <Stat label="Items" value={String(Number(invAgg[0]?.total ?? 0))} />
          <Stat label="Invested" value={formatCurrency(Number(invAgg[0]?.invested ?? 0))} />
          <Stat label="Tax Rate" value={`${(taxRate * 100).toFixed(2)}%`} />
          <Stat
            label="Avg Sale"
            value={formatCurrency(salesData.length > 0 ? totalRevenue / salesData.length : 0)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="font-semibold mb-2">By Platform</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th>Platform</th>
                  <th className="text-right">Count</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(platformMap.entries()).map(([p, v]) => (
                  <tr key={p} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="py-1">{PLATFORM_LABELS[p as Platform] ?? p}</td>
                    <td className="py-1 text-right">{v.count}</td>
                    <td className="py-1 text-right">{formatCurrency(v.revenue)}</td>
                    <td className={"py-1 text-right " + (v.profit >= 0 ? "text-green-600" : "text-red-600")}>
                      {formatCurrency(v.profit)}
                    </td>
                  </tr>
                ))}
                {platformMap.size === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-2">No data.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="font-semibold mb-2">Monthly Trend</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th>Month</th>
                  <th className="text-right">Sales</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(monthMap.entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([k, v]) => (
                    <tr key={k} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="py-1">{k}</td>
                      <td className="py-1 text-right">{v.count}</td>
                      <td className="py-1 text-right">{formatCurrency(v.revenue)}</td>
                      <td className={"py-1 text-right " + (v.profit >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatCurrency(v.profit)}
                      </td>
                    </tr>
                  ))}
                {monthMap.size === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-2">No data.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={"p-4 rounded-lg shadow " + (highlight ? "bg-green-50 dark:bg-green-900/20" : "bg-white dark:bg-gray-800")}>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className={"text-2xl font-bold " + (highlight ? "text-green-600" : "")}>{value}</div>
    </div>
  );
}
