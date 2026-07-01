import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { canViewAllData } from '@/lib/auth-utils';
import { calculateProfit } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';
import Header from '@/components/header';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const viewAll = canViewAllData(session);
  const userId = parseInt(session.user.id, 10);

  const itemConditions = viewAll ? undefined : eq(items.ownerId, userId);
  const saleConditions = viewAll ? undefined : eq(sales.soldBy, userId);

  const allItems = await db.query.items.findMany({ where: itemConditions });
  const allSales = await db.query.sales.findMany({ where: saleConditions, with: { item: true } });

  const availableItems = allItems.filter((i) => i.status === 'available').length;
  const listedItems = allItems.filter((i) => i.status === 'listed').length;
  const soldItems = allItems.filter((i) => i.status === 'sold').length;

  const totalProfit = allSales.reduce((sum, s) => {
    const purchasePrice = s.item?.purchasePrice ?? 0;
    return sum + calculateProfit({
      soldPrice: s.soldPrice,
      shippingCollected: s.shippingCollected,
      salesTax: s.salesTax,
      platformFees: s.platformFees,
      refundAmount: s.refundAmount,
      purchasePrice,
      shippingCost: s.shippingCost,
    });
  }, 0);

  const totalRevenue = allSales.reduce((sum, s) => sum + s.soldPrice, 0);

  return (
    <div>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Available Items</p>
            <p className="text-3xl font-bold text-green-600">{availableItems}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Listed Items</p>
            <p className="text-3xl font-bold text-blue-600">{listedItems}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
            <p className="text-3xl font-bold text-purple-600">{allSales.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Profit</p>
            <p className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalProfit)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/inventory/new" className="card hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-2">Add Item</h2>
            <p className="text-gray-600 dark:text-gray-300">Record a new inventory purchase</p>
          </Link>
          <Link href="/sales/new" className="card hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-2">Record Sale</h2>
            <p className="text-gray-600 dark:text-gray-300">Log a new sale transaction</p>
          </Link>
        </div>
      </main>
    </div>
  );
}