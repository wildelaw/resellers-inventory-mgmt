import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { eq, sql, and, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { canViewAllData, sessionUserId } from '@/lib/auth-utils';
import { calculateProfit } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';
import Header from '@/components/header';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const uid = sessionUserId(session);
  const viewAll = canViewAllData(session);

  const itemWhere = viewAll ? undefined : eq(items.ownerId, uid);
  const saleWhere = viewAll ? undefined : eq(sales.soldBy, uid);

  const [allItems, allSales] = await Promise.all([
    db.query.items.findMany({ where: itemWhere }),
    db.query.sales.findMany({ where: saleWhere, with: { item: true } }),
  ]);

  const totalItems = allItems.length;
  const availableItems = allItems.filter((i) => i.status === 'available').length;
  const listedItems = allItems.filter((i) => i.status === 'listed').length;
  const totalSales = allSales.length;
  const totalProfit = allSales.reduce((sum, s) => sum + calculateProfit({ ...s, purchasePrice: s.item?.purchasePrice ?? 0 }), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Items" value={String(totalItems)} color="blue" />
          <StatCard label="Available" value={String(availableItems)} color="green" />
          <StatCard label="Total Sales" value={String(totalSales)} color="purple" />
          <StatCard label="Total Profit" value={formatCurrency(totalProfit)} color="amber" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/inventory/new" className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg text-center">
            <div className="text-lg font-semibold">Add Item</div>
            <div className="text-sm opacity-80">Add a new inventory item</div>
          </Link>
          <Link href="/sales/new" className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg text-center">
            <div className="text-lg font-semibold">Record Sale</div>
            <div className="text-sm opacity-80">Record a new sale</div>
          </Link>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  };
  return (
    <div className={`rounded-lg shadow p-6 ${colors[color]}`}>
      <div className="text-sm font-medium opacity-80">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}
