import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { canViewAllData } from '@/lib/auth-utils';
import { calculateProfit } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';
import { eq } from 'drizzle-orm';
import Header from '@/components/header';
import Link from 'next/link';

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const viewAll = canViewAllData(session);
  const userId = parseInt(session.user.id);

  const salesWhere = viewAll ? undefined : eq(sales.soldBy, userId);
  const itemsWhere = viewAll ? undefined : eq(items.ownerId, userId);
  const mileageWhere = viewAll ? undefined : eq(mileage.ownerId, userId);

  const [allSales, allItems, allMileage] = await Promise.all([
    db.query.sales.findMany({
      where: salesWhere,
      with: { item: { columns: { purchasePrice: true } } },
    }),
    db.query.items.findMany({
      where: itemsWhere,
      columns: { status: true, purchasePrice: true },
    }),
    db.query.mileage.findMany({
      where: mileageWhere,
      columns: { miles: true },
    }),
  ]);

  // Compute aggregates using the single-source profit function
  let totalProfit = 0;
  let totalRevenue = 0;
  let totalRefunds = 0;
  const platformBreakdown: Record<string, { count: number; revenue: number; profit: number }> = {};

  for (const sale of allSales) {
    if (!sale.item) continue;
    const profit = calculateProfit({
      soldPrice: sale.soldPrice,
      shippingCollected: sale.shippingCollected,
      salesTax: sale.salesTax,
      platformFees: sale.platformFees,
      refundAmount: sale.refundAmount,
      purchasePrice: sale.item.purchasePrice,
      shippingCost: sale.shippingCost,
    });
    totalProfit += profit;
    totalRevenue += sale.soldPrice;
    totalRefunds += sale.refundAmount || 0;

    if (!platformBreakdown[sale.platform]) {
      platformBreakdown[sale.platform] = { count: 0, revenue: 0, profit: 0 };
    }
    platformBreakdown[sale.platform].count++;
    platformBreakdown[sale.platform].revenue += sale.soldPrice;
    platformBreakdown[sale.platform].profit += profit;
  }

  const totalItems = allItems.length;
  const availableItems = allItems.filter(i => i.status === 'available').length;
  const soldItems = allItems.filter(i => i.status === 'sold').length;
  const totalCogs = allItems.reduce((sum, i) => sum + i.purchasePrice, 0);
  const totalMiles = allMileage.reduce((sum, m) => sum + m.miles, 0);

  const stats = [
    { label: 'Total Inventory', value: String(totalItems) },
    { label: 'Available', value: String(availableItems) },
    { label: 'Sold', value: String(soldItems) },
    { label: 'Total Sales', value: String(allSales.length) },
    { label: 'Total Revenue', value: formatCurrency(totalRevenue) },
    { label: 'Total Profit', value: formatCurrency(totalProfit), highlight: totalProfit >= 0 ? 'green' : 'red' },
    { label: 'Total Refunds', value: formatCurrency(totalRefunds) },
    { label: 'Total COGS', value: formatCurrency(totalCogs) },
    { label: 'Total Miles', value: totalMiles.toFixed(1) },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Reports</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(({ label, value, highlight }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${
                highlight === 'green' ? 'text-green-600 dark:text-green-400' :
                highlight === 'red' ? 'text-red-600 dark:text-red-400' :
                'text-gray-900 dark:text-white'
              }`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {Object.keys(platformBreakdown).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Sales by Platform</h2>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase pb-3">Platform</th>
                  <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase pb-3">Sales</th>
                  <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase pb-3">Revenue</th>
                  <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase pb-3">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {Object.entries(platformBreakdown)
                  .sort((a, b) => b[1].profit - a[1].profit)
                  .map(([platform, data]) => (
                  <tr key={platform}>
                    <td className="py-3 text-sm text-gray-900 dark:text-white capitalize">{platform}</td>
                    <td className="py-3 text-sm text-right text-gray-600 dark:text-gray-300">{data.count}</td>
                    <td className="py-3 text-sm text-right text-gray-600 dark:text-gray-300">{formatCurrency(data.revenue)}</td>
                    <td className={`py-3 text-sm text-right font-medium ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(data.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
