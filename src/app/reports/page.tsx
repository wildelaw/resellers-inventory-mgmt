import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { eq, count, sum, sql } from 'drizzle-orm';
import { canViewAllData } from '@/lib/auth-utils';
import { calculateProfit } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';
import { PLATFORM_LABELS, ALL_PLATFORMS, type Platform } from '@/lib/constants';
import Header from '@/components/header';

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const viewAll = canViewAllData(session);
  const userId = Number(session.user.id);

  // Fetch data based on RBAC
  const saleWhere = viewAll ? undefined : eq(sales.soldBy, userId);
  const allSales = await db.query.sales.findMany({
    where: saleWhere,
    with: { item: true },
  });

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

  const totalRevenue = allSales.reduce((s, sale) => s + sale.soldPrice, 0);
  const totalRefunds = allSales.reduce((s, sale) => s + (sale.refundAmount ?? 0), 0);

  // Sales by platform
  const salesByPlatform = ALL_PLATFORMS.map(platform => {
    const platformSales = allSales.filter(s => s.platform === platform);
    return {
      platform,
      label: PLATFORM_LABELS[platform as Platform],
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

  // Inventory stats
  const itemWhere = viewAll ? undefined : eq(items.ownerId, userId);
  const itemStats = await db.select({
    total: count(),
    available: sql<number>`sum(CASE WHEN ${items.status} = 'available' THEN 1 ELSE 0 END)`,
    listed: sql<number>`sum(CASE WHEN ${items.status} = 'listed' THEN 1 ELSE 0 END)`,
    sold: sql<number>`sum(CASE WHEN ${items.status} = 'sold' THEN 1 ELSE 0 END)`,
    donated: sql<number>`sum(CASE WHEN ${items.status} = 'donated' THEN 1 ELSE 0 END)`,
    discarded: sql<number>`sum(CASE WHEN ${items.status} = 'discarded' THEN 1 ELSE 0 END)`,
  }).from(items).where(itemWhere);

  // Mileage
  const mileageStats = await db.select({
    totalMiles: sum(mileage.miles),
    totalTrips: count(),
  }).from(mileage).where(eq(mileage.ownerId, userId));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Reports</h1>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Profit</p>
            <p className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(totalProfit)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Refunds</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalRefunds)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{allSales.length}</p>
          </div>
        </div>

        {/* Inventory Summary */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Inventory Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(itemStats[0]?.total ?? 0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Available</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{Number(itemStats[0]?.available ?? 0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Listed</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Number(itemStats[0]?.listed ?? 0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sold</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Number(itemStats[0]?.sold ?? 0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Donated</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{Number(itemStats[0]?.donated ?? 0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Discarded</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{Number(itemStats[0]?.discarded ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Sales by Platform */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Sales by Platform</h2>
          {salesByPlatform.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No sales data available.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Platform</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Sales Count</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Profit</th>
                </tr>
              </thead>
              <tbody>
                {salesByPlatform.map(p => (
                  <tr key={p.platform} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 text-sm">{p.label}</td>
                    <td className="py-2 text-right text-sm">{p.count}</td>
                    <td className="py-2 text-right text-sm">{formatCurrency(p.revenue)}</td>
                    <td className={`py-2 text-right text-sm font-medium ${p.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Mileage Summary */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Mileage Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Miles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(mileageStats[0]?.totalMiles ?? 0).toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Trips</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(mileageStats[0]?.totalTrips ?? 0)}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}