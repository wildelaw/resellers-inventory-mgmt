import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import { canViewAllData } from '@/lib/auth-utils';
import { STATUS_LABELS, STATUS_COLORS, PLATFORM_LABELS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';
import Header from '@/components/header';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const viewAll = canViewAllData(session);
  const userId = Number(session.user.id);

  // Inventory stats
  const itemConditions = viewAll ? undefined : eq(items.ownerId, userId);
  const itemWhere = itemConditions ? and(itemConditions) : undefined;

  const inventoryStats = await db.select({
    total: sql<number>`count(*)`,
    available: sql<number>`sum(case when ${items.status} = 'available' then 1 else 0 end)`,
    listed: sql<number>`sum(case when ${items.status} = 'listed' then 1 else 0 end)`,
    sold: sql<number>`sum(case when ${items.status} = 'sold' then 1 else 0 end)`,
    returned: sql<number>`sum(case when ${items.status} = 'returned' then 1 else 0 end)`,
    donated: sql<number>`sum(case when ${items.status} = 'donated' then 1 else 0 end)`,
    discarded: sql<number>`sum(case when ${items.status} = 'discarded' then 1 else 0 end)`,
    totalValue: sql<number>`coalesce(sum(${items.purchasePrice}), 0)`,
  }).from(items).where(itemWhere).get();

  // Sales stats
  const saleConditions = [];
  if (!viewAll) {
    saleConditions.push(eq(sales.soldBy, userId));
  }

  const saleWhere = saleConditions.length > 0 ? and(...saleConditions) : undefined;
  const salesData = await db.select().from(sales).where(saleWhere).orderBy(sql`${sales.soldDate} desc`).all();

  // Compute stats
  let totalRevenue = 0;
  let totalProfit = 0;
  const byPlatform: Record<string, { count: number; revenue: number; profit: number }> = {};
  const monthlyTrends: Record<string, { count: number; revenue: number; profit: number }> = {};

  for (const sale of salesData) {
    let purchasePrice = 0;
    if (sale.itemId) {
      const item = await db.select({ purchasePrice: items.purchasePrice }).from(items).where(eq(items.id, sale.itemId)).get();
      purchasePrice = item?.purchasePrice ?? 0;
    }

    const profit = calculateProfit({
      soldPrice: sale.soldPrice,
      shippingCollected: sale.shippingCollected,
      salesTax: sale.salesTax,
      platformFees: sale.platformFees,
      refundAmount: sale.refundAmount,
      purchasePrice,
      shippingCost: sale.shippingCost,
    });
    const revenue = sale.soldPrice + (sale.shippingCollected ?? 0);

    totalRevenue += revenue;
    totalProfit += profit;

    const platform = sale.platform || 'other';
    if (!byPlatform[platform]) byPlatform[platform] = { count: 0, revenue: 0, profit: 0 };
    byPlatform[platform].count++;
    byPlatform[platform].revenue += revenue;
    byPlatform[platform].profit += profit;

    const date = new Date(sale.soldDate * 1000);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyTrends[monthKey]) monthlyTrends[monthKey] = { count: 0, revenue: 0, profit: 0 };
    monthlyTrends[monthKey].count++;
    monthlyTrends[monthKey].revenue += revenue;
    monthlyTrends[monthKey].profit += profit;
  }

  const inventory = inventoryStats ?? {
    total: 0, available: 0, listed: 0, sold: 0,
    returned: 0, donated: 0, discarded: 0, totalValue: 0,
  };

  const sortedMonths = Object.keys(monthlyTrends).sort().reverse();

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Reports</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Items</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{inventory.total}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Inventory Value</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{formatCurrency(inventory.totalValue)}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalRevenue)}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Profit</div>
              <div className={`mt-1 text-3xl font-semibold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalProfit)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Items by Status</h2>
            <div className="space-y-3">
              {(['available', 'listed', 'sold', 'returned', 'donated', 'discarded'] as const).map((status) => {
                const count = inventory[status] as number;
                const percentage = inventory.total > 0 ? (count / inventory.total) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Sales by Platform</h2>
            {Object.keys(byPlatform).length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No sales data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Platform</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Sales</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Revenue</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {Object.entries(byPlatform).map(([platform, data]) => (
                      <tr key={platform}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS] || platform}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white text-right">{data.count}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white text-right">{formatCurrency(data.revenue)}</td>
                        <td className={`px-4 py-2 text-sm font-medium text-right ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 lg:col-span-2">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Monthly Trends</h2>
            {sortedMonths.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No monthly data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Month</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Sales</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Revenue</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedMonths.map((month) => {
                      const data = monthlyTrends[month];
                      return (
                        <tr key={month}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{month}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white text-right">{data.count}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white text-right">{formatCurrency(data.revenue)}</td>
                          <td className={`px-4 py-2 text-sm font-medium text-right ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.profit)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}