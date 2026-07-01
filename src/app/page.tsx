import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { canViewAllData } from '@/lib/auth-utils';
import { calculateProfit } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';
import { eq, sql } from 'drizzle-orm';
import Link from 'next/link';
import Header from '@/components/header';

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  // Determine if user can view all data
  const viewAll = canViewAllData(session);

  // Get inventory stats
  const inventoryCondition = viewAll ? undefined : eq(items.ownerId, parseInt(session.user.id));
  
  const inventoryStats = await db
    .select({
      status: items.status,
      count: sql<number>`count(*)`,
      totalValue: sql<number>`sum(${items.purchasePrice})`,
    })
    .from(items)
    .where(inventoryCondition)
    .groupBy(items.status);

  // Get sales data
  const salesCondition = viewAll ? undefined : eq(sales.soldBy, parseInt(session.user.id));
  
  const salesData = await db.query.sales.findMany({
    where: salesCondition,
    with: {
      item: {
        columns: {
          purchasePrice: true,
        },
      },
    },
    limit: 100, // Recent sales for quick stats
  });

  // Calculate profit
  let totalProfit = 0;
  let totalRevenue = 0;
  
  for (const sale of salesData) {
    if (sale.item) {
      totalProfit += calculateProfit({
        soldPrice: sale.soldPrice,
        shippingCollected: sale.shippingCollected,
        salesTax: sale.salesTax,
        platformFees: sale.platformFees,
        refundAmount: sale.refundAmount,
        purchasePrice: sale.item.purchasePrice,
        shippingCost: sale.shippingCost,
      });
    }
    totalRevenue += sale.soldPrice;
  }

  const totalItems = inventoryStats.reduce((sum, s) => sum + s.count, 0);
  const availableItems = inventoryStats.find(s => s.status === 'available')?.count || 0;
  const soldItems = inventoryStats.find(s => s.status === 'sold')?.count || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Items
            </h3>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {totalItems}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Available
            </h3>
            <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
              {availableItems}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Sales
            </h3>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {salesData.length}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Profit
            </h3>
            <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(totalProfit)}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/inventory/new"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Add New Item
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add a new item to your inventory
            </p>
          </Link>

          <Link
            href="/sales/new"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Record Sale
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Record a new sale transaction
            </p>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/inventory"
            className="text-center py-4 px-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <span className="text-gray-900 dark:text-white font-medium">Inventory</span>
          </Link>
          <Link
            href="/sales"
            className="text-center py-4 px-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <span className="text-gray-900 dark:text-white font-medium">Sales</span>
          </Link>
          <Link
            href="/mileage"
            className="text-center py-4 px-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <span className="text-gray-900 dark:text-white font-medium">Mileage</span>
          </Link>
          <Link
            href="/reports"
            className="text-center py-4 px-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <span className="text-gray-900 dark:text-white font-medium">Reports</span>
          </Link>
        </div>
      </main>
    </div>
  );
}