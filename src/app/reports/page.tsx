import { redirect } from 'next/navigation';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { canViewAllData, sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { calculateProfit, calculateNetRevenue } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';
import PageShell from '@/components/page-shell';

// Server Component — profitability report. All profit math goes through the
// single-source functions in src/lib/financial.ts (no SQL duplicate).
export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const sp = await searchParams;
  const startDate = typeof sp.startDate === 'string' ? sp.startDate : undefined;
  const endDate = typeof sp.endDate === 'string' ? sp.endDate : undefined;

  const saleConditions = [];
  if (!canViewAllData(session)) saleConditions.push(eq(sales.soldBy, sessionUserId(session)));
  if (startDate) saleConditions.push(gte(sales.soldDate, new Date(`${startDate}T00:00:00.000Z`)));
  if (endDate) saleConditions.push(lte(sales.soldDate, new Date(`${endDate}T23:59:59.999Z`)));
  const saleWhere = saleConditions.length > 0 ? and(...saleConditions) : undefined;

  const itemConditions = [];
  if (!canViewAllData(session)) itemConditions.push(eq(items.ownerId, sessionUserId(session)));

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
      where: saleWhere,
      with: { item: { columns: { purchasePrice: true } } },
    }),
    db
      .select({
        platform: sales.platform,
        count: sql<number>`count(*)`,
        totalRevenue: sql<number>`coalesce(sum(${sales.soldPrice} + coalesce(${sales.shippingCollected}, 0)), 0)`,
      })
      .from(sales)
      .where(saleWhere)
      .groupBy(sales.platform),
    db
      .select({
        month: sql<string>`strftime('%Y-%m', ${sales.soldDate} / 1000, 'unixepoch')`,
        revenue: sql<number>`coalesce(sum(${sales.soldPrice} + coalesce(${sales.shippingCollected}, 0)), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(sales)
      .where(saleWhere)
      .groupBy(sql`strftime('%Y-%m', ${sales.soldDate} / 1000, 'unixepoch')`)
      .orderBy(sql`strftime('%Y-%m', ${sales.soldDate} / 1000, 'unixepoch')`),
  ]);

  const salesWithPurchase = saleRows.filter((s) => s.item != null);
  const totalProfit = salesWithPurchase.reduce(
    (sum, s) => sum + calculateProfit({
      soldPrice: s.soldPrice,
      shippingCollected: s.shippingCollected,
      salesTax: s.salesTax,
      platformFees: s.platformFees,
      refundAmount: s.refundAmount,
      purchasePrice: s.item!.purchasePrice,
      shippingCost: s.shippingCost,
    }),
    0
  );
  const totalNetRevenue = saleRows.reduce(
    (sum, s) => sum + calculateNetRevenue({
      soldPrice: s.soldPrice,
      shippingCollected: s.shippingCollected,
      salesTax: s.salesTax,
      platformFees: s.platformFees,
      refundAmount: s.refundAmount,
    }),
    0
  );

  const inventory: { totalItems: number; totalCost: number; byStatus: Record<string, number> } = {
    totalItems: 0,
    totalCost: 0,
    byStatus: {},
  };
  for (const row of inventoryStats) {
    inventory.totalItems += Number(row.count);
    inventory.totalCost += Number(row.totalCost);
    inventory.byStatus[row.status] = Number(row.count);
  }

  const stat = (label: string, value: string, cls?: string) => (
    <div key={label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <p className="text-xs uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${cls ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );

  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Reports</h1>

      <form method="get" className="flex flex-wrap gap-3 mb-6">
        <input
          type="date"
          name="startDate"
          defaultValue={startDate}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
        />
        <input
          type="date"
          name="endDate"
          defaultValue={endDate}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
          Apply
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stat('Sales', String(saleRows.length))}
        {stat('Gross Revenue', formatCurrency(saleRows.reduce((sum, s) => sum + s.soldPrice + (s.shippingCollected || 0), 0)))}
        {stat('Net Revenue', formatCurrency(totalNetRevenue))}
        {stat('Profit', formatCurrency(totalProfit), totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">By Platform</h2>
          {byPlatform.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No sales in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 pb-2">Platform</th>
                  <th className="text-right text-xs uppercase text-gray-500 dark:text-gray-400 pb-2">Sales</th>
                  <th className="text-right text-xs uppercase text-gray-500 dark:text-gray-400 pb-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {byPlatform.map((p) => (
                  <tr key={p.platform}>
                    <td className="py-1.5 text-gray-900 dark:text-white">{p.platform}</td>
                    <td className="py-1.5 text-right text-gray-900 dark:text-white">{Number(p.count)}</td>
                    <td className="py-1.5 text-right text-gray-900 dark:text-white">{formatCurrency(Number(p.totalRevenue))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Revenue</h2>
          {monthly.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No sales in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 pb-2">Month</th>
                  <th className="text-right text-xs uppercase text-gray-500 dark:text-gray-400 pb-2">Sales</th>
                  <th className="text-right text-xs uppercase text-gray-500 dark:text-gray-400 pb-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.month}>
                    <td className="py-1.5 text-gray-900 dark:text-white">{m.month}</td>
                    <td className="py-1.5 text-right text-gray-900 dark:text-white">{Number(m.count)}</td>
                    <td className="py-1.5 text-right text-gray-900 dark:text-white">{formatCurrency(Number(m.revenue))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Inventory</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span className="text-gray-900 dark:text-white">Total items: <strong>{inventory.totalItems}</strong></span>
          <span className="text-gray-900 dark:text-white">Total cost: <strong>{formatCurrency(inventory.totalCost)}</strong></span>
          {Object.entries(inventory.byStatus).map(([status, count]) => (
            <span key={status} className="text-gray-500 dark:text-gray-400">
              {status}: <strong>{count}</strong>
            </span>
          ))}
        </div>
      </div>
    </PageShell>
  );
}