import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { canViewAllData } from '@/lib/auth-utils';
import { eq, sql } from 'drizzle-orm';
import { calculateProfit } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = parseInt(session.user.id);
  const whereCondition = canViewAllData(session) ? undefined : eq(items.ownerId, userId);
  const saleWhereCondition = canViewAllData(session) ? undefined : eq(sales.soldBy, userId);

  const [inventoryStats, recentSales] = await Promise.all([
    db.select({
      total: sql<number>`count(*)`,
      available: sql<number>`sum(case when ${items.status} = 'available' then 1 else 0 end)`,
      listed: sql<number>`sum(case when ${items.status} = 'listed' then 1 else 0 end)`,
      sold: sql<number>`sum(case when ${items.status} = 'sold' then 1 else 0 end)`,
      totalValue: sql<number>`coalesce(sum(${items.purchasePrice}), 0)`,
    }).from(items).where(whereCondition),
    db.query.sales.findMany({
      where: saleWhereCondition ? eq(sales.soldBy, userId) : undefined,
      with: { item: true },
      limit: 5,
      orderBy: (sales, { desc }) => [desc(sales.createdAt)],
    }),
  ]);

  const stats = inventoryStats[0];
  const totalProfit = recentSales.reduce((sum, sale) =>
    sum + calculateProfit({
      soldPrice: sale.soldPrice,
      shippingCollected: sale.shippingCollected,
      salesTax: sale.salesTax,
      platformFees: sale.platformFees,
      refundAmount: sale.refundAmount,
      purchasePrice: (sale.item as any)?.purchasePrice ?? 0,
      shippingCost: sale.shippingCost,
    }), 0
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Items</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(stats.total)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Available</h3>
            <p className="text-2xl font-bold text-green-600">{Number(stats.available)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Invested</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(Number(stats.totalValue))}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Recent Profit</h3>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totalProfit)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a href="/inventory/new" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow p-6 text-center text-lg font-semibold transition-colors">Add New Item</a>
          <a href="/sales/new" className="bg-green-600 hover:bg-green-700 text-white rounded-lg shadow p-6 text-center text-lg font-semibold transition-colors">Record a Sale</a>
        </div>
      </main>
    </div>
  );
}