import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { eq, count, sum, sql } from 'drizzle-orm';
import { canViewAllData } from '@/lib/auth-utils';
import { calculateProfit } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';
import Header from '@/components/header';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const viewAll = canViewAllData(session);
  const userId = Number(session.user.id);

  // Inventory stats
  const itemWhere = viewAll ? undefined : eq(items.ownerId, userId);
  const itemStats = await db.select({
    total: count(),
    available: sql<number>`sum(CASE WHEN ${items.status} = 'available' THEN 1 ELSE 0 END)`,
    sold: sql<number>`sum(CASE WHEN ${items.status} = 'sold' THEN 1 ELSE 0 END)`,
  }).from(items).where(itemWhere);

  // Sales stats
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

  // Mileage stats
  const mileageStats = await db.select({
    totalMiles: sum(mileage.miles),
    totalTrips: count(),
  }).from(mileage).where(eq(mileage.ownerId, userId));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Items</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{Number(itemStats[0]?.total ?? 0)}</p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">{Number(itemStats[0]?.available ?? 0)} available</p>
          </div>

          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{allSales.length} sales</p>
          </div>

          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Profit</p>
            <p className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(totalProfit)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{Number(itemStats[0]?.sold ?? 0)} items sold</p>
          </div>

          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Mileage</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{Number(mileageStats[0]?.totalMiles ?? 0).toFixed(0)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{Number(mileageStats[0]?.totalTrips ?? 0)} trips</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/inventory/new" className="card hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Add New Item</h2>
            <p className="text-gray-500 dark:text-gray-400">Record a new inventory purchase</p>
          </Link>

          <Link href="/sales/new" className="card hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Record Sale</h2>
            <p className="text-gray-500 dark:text-gray-400">Log a new sale with profit tracking</p>
          </Link>
        </div>
      </main>
    </div>
  );
}