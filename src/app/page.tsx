import Link from 'next/link';
import { and, eq, sql } from 'drizzle-orm';
import AppShell from '@/components/app-shell';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { canViewAllData } from '@/lib/auth-utils';
import { calculateProfit } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;
  const uid = parseInt(session.user.id, 10) || 0;
  const viewAll = canViewAllData(session);

  const invWhere = viewAll ? undefined : eq(items.ownerId, uid);
  const saleWhere = viewAll ? undefined : eq(sales.soldBy, uid);
  const mileWhere = viewAll ? undefined : eq(mileage.ownerId, uid);

  const itemCount = db.select({ c: sql<number>`COUNT(*)` }).from(items).where(invWhere).get()?.c ?? 0;
  const availableWhere = and(eq(items.status, 'available'), invWhere ?? undefined);
  const availableCount = db.select({ c: sql<number>`COUNT(*)` }).from(items).where(availableWhere).get()?.c ?? 0;
  const saleRows = db.query.sales.findMany({ where: saleWhere, with: { item: true } }).sync();
  const totalProfit = saleRows.reduce((sum, s) => sum + calculateProfit({
    soldPrice: Number(s.soldPrice),
    shippingCollected: s.shippingCollected ?? 0,
    salesTax: s.salesTax ?? 0,
    platformFees: s.platformFees ?? 0,
    refundAmount: s.refundAmount ?? 0,
    purchasePrice: s.item ? Number(s.item.purchasePrice) : 0,
    shippingCost: s.shippingCost ?? 0,
  }), 0);
  const miles = db.select({ total: sql<number>`COALESCE(SUM(${mileage.miles}),0)` }).from(mileage).where(mileWhere).get()?.total ?? 0;

  const stats = [
    { label: 'Inventory items', value: String(itemCount) },
    { label: 'Available', value: String(availableCount) },
    { label: 'Total profit', value: formatCurrency(totalProfit) },
    { label: 'Miles logged', value: miles.toFixed(1) },
  ];

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/inventory/new" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow p-6 block">
          <p className="text-lg font-semibold">Add Item</p>
          <p className="text-sm opacity-90">Record a new inventory purchase.</p>
        </Link>
        <Link href="/sales/new" className="bg-green-600 hover:bg-green-700 text-white rounded-lg shadow p-6 block">
          <p className="text-lg font-semibold">Record Sale</p>
          <p className="text-sm opacity-90">Log a sale and update item status.</p>
        </Link>
      </div>
    </AppShell>
  );
}