import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import { canViewAllData } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import { calculateProfit } from '@/lib/financial';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/constants';
import Header from '@/components/header';
import Link from 'next/link';

export default async function DashboardPage() {
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
  const saleConditions = viewAll ? undefined : eq(sales.soldBy, userId);
  const saleWhere = saleConditions ? and(saleConditions) : undefined;

  const salesData = await db.select().from(sales).where(saleWhere).orderBy(sql`${sales.soldDate} desc`).limit(50).all();

  let totalRevenue = 0;
  let totalProfit = 0;

  for (const sale of salesData) {
    let purchasePrice = 0;
    if (sale.itemId) {
      const item = await db.select({ purchasePrice: items.purchasePrice }).from(items).where(eq(items.id, sale.itemId)).get();
      purchasePrice = item?.purchasePrice ?? 0;
    }
    totalRevenue += sale.soldPrice + (sale.shippingCollected ?? 0);
    totalProfit += calculateProfit({
      soldPrice: sale.soldPrice,
      shippingCollected: sale.shippingCollected,
      salesTax: sale.salesTax,
      platformFees: sale.platformFees,
      refundAmount: sale.refundAmount,
      purchasePrice,
      shippingCost: sale.shippingCost,
    });
  }

  const stats = inventoryStats ?? {
    total: 0, available: 0, listed: 0, sold: 0,
    returned: 0, donated: 0, discarded: 0, totalValue: 0,
  };

  const statusBreakdown = [
    { key: 'available' as const, count: stats.available },
    { key: 'listed' as const, count: stats.listed },
    { key: 'sold' as const, count: stats.sold },
    { key: 'returned' as const, count: stats.returned },
    { key: 'donated' as const, count: stats.donated },
    { key: 'discarded' as const, count: stats.discarded },
  ];

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Items</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{stats.total}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Inventory Value</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{formatCurrency(stats.totalValue)}</div>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Breakdown */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 lg:col-span-2">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Items by Status</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {statusBreakdown.map(({ key, count }) => (
                <Link
                  key={key}
                  href={`/inventory?status=${key}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[key]}`}>
                    {STATUS_LABELS[key]}
                  </span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">{count}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/inventory/new"
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Add Item
              </Link>
              <Link
                href="/sales/new"
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Record Sale
              </Link>
              <Link
                href="/mileage/new"
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Add Mileage
              </Link>
              <Link
                href="/imports"
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Import CSV
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Sales */}
        {salesData.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Sales</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Platform</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Profit</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {salesData.slice(0, 10).map((sale) => {
                    const profit = calculateProfit({
                      soldPrice: sale.soldPrice,
                      shippingCollected: sale.shippingCollected,
                      salesTax: sale.salesTax,
                      platformFees: sale.platformFees,
                      refundAmount: sale.refundAmount,
                      purchasePrice: 0,
                      shippingCost: sale.shippingCost,
                    });
                    return (
                      <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <Link href={`/sales/${sale.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                            {new Date(sale.soldDate * 1000).toLocaleDateString()}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formatCurrency(sale.soldPrice)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white capitalize">{sale.platform}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(profit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}