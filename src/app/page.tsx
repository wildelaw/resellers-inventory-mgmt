import { redirect } from 'next/navigation';
import Link from 'next/link';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { canViewAllData, sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { calculateProfit } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';
import PageShell from '@/components/page-shell';

// Server Component — queries the database directly
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = sessionUserId(session);
  const seesAll = canViewAllData(session);

  const itemWhere = seesAll ? undefined : eq(items.ownerId, userId);
  const saleWhere = seesAll ? undefined : eq(sales.soldBy, userId);

  const [itemStats, saleRows] = await Promise.all([
    db
      .select({
        status: items.status,
        count: sql<number>`count(*)`,
        totalCost: sql<number>`coalesce(sum(${items.purchasePrice}), 0)`,
      })
      .from(items)
      .where(itemWhere)
      .groupBy(items.status),
    db.query.sales.findMany({
      where: saleWhere,
      with: { item: { columns: { name: true, purchasePrice: true } } },
      orderBy: [sql`${sales.soldDate} desc`],
      limit: 5,
    }),
  ]);

  let availableCount = 0;
  let listedCount = 0;
  let inventoryValue = 0;
  for (const row of itemStats) {
    if (row.status === 'available') availableCount = Number(row.count);
    if (row.status === 'listed') listedCount = Number(row.count);
    if (row.status === 'available' || row.status === 'listed') {
      inventoryValue += Number(row.totalCost);
    }
  }

  const soldCount = Number(itemStats.find((r) => r.status === 'sold')?.count ?? 0);
  const totalProfit = saleRows.reduce(
    (sum, s) => (s.item ? sum + calculateProfit({ ...s, purchasePrice: s.item.purchasePrice }) : sum),
    0
  );

  const stats = [
    { label: 'Available Items', value: String(availableCount), color: 'text-green-600 dark:text-green-400' },
    { label: 'Listed Items', value: String(listedCount), color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Inventory Value', value: formatCurrency(inventoryValue), color: 'text-gray-900 dark:text-white' },
    { label: 'Profit (recent sales)', value: formatCurrency(totalProfit), color: totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
  ];

  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className={`text-2xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/inventory/new"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Item</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Record a new inventory purchase</p>
        </Link>
        <Link
          href="/sales/new"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Record Sale</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Log a sale and update item status</p>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Sales</h2>
        {saleRows.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No sales recorded yet. <span className="sr-only">{soldCount} total</span></p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {saleRows.map((sale) => (
              <li key={sale.id} className="py-3 flex justify-between items-center">
                <Link href={`/sales/${sale.id}`} className="text-sm text-gray-900 dark:text-white hover:text-blue-600">
                  {sale.item?.name ?? 'Unlinked sale'} — {formatCurrency(sale.soldPrice)}
                </Link>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {sale.soldDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}