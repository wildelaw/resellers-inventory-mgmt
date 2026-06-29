import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { canViewAllData } from '@/lib/auth-utils';
import { calculateProfit } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';
import Header from '@/components/header';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const itemWhere = canViewAllData(session) ? undefined : eq(items.ownerId, Number(session.user.id));
  const itemRows = itemWhere ? db.select().from(items).where(itemWhere).all() : db.select().from(items).all();

  const saleWhere = canViewAllData(session) ? undefined : eq(sales.soldBy, Number(session.user.id));
  const saleRows = saleWhere ? db.select().from(sales).where(saleWhere).all() : db.select().from(sales).all();

  const itemIdToPurchase = new Map<number, number>();
  for (const item of itemRows) itemIdToPurchase.set(item.id, item.purchasePrice);

  const totalProfit = saleRows.reduce((s, sale) => {
    const purchase = sale.itemId ? (itemIdToPurchase.get(sale.itemId) ?? 0) : 0;
    return s + calculateProfit({
      soldPrice: sale.soldPrice,
      shippingCollected: sale.shippingCollected,
      salesTax: sale.salesTax,
      platformFees: sale.platformFees,
      refundAmount: sale.refundAmount,
      shippingCost: sale.shippingCost,
      purchasePrice: purchase,
    });
  }, 0);

  const availableCount = itemRows.filter((i) => i.status === 'available').length;
  const soldCount = itemRows.filter((i) => i.status === 'sold').length;
  const salesCount = saleRows.length;

  const mileageRows = db.select().from(mileage).where(eq(mileage.ownerId, Number(session.user.id))).all();
  const totalMiles = mileageRows.reduce((s, r) => s + r.miles, 0);

  const stats = [
    { label: 'Available items', value: String(availableCount) },
    { label: 'Sold items', value: String(soldCount) },
    { label: 'Sales recorded', value: String(salesCount) },
    { label: 'Total profit', value: formatCurrency(totalProfit) },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400">{s.label}</div>
              <div className="mt-2 text-2xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/inventory/new" className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg shadow">
            <div className="text-lg font-semibold">Add Item</div>
            <div className="text-sm opacity-90">Record a new inventory purchase</div>
          </Link>
          <Link href="/sales/new" className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg shadow">
            <div className="text-lg font-semibold">Record Sale</div>
            <div className="text-sm opacity-90">Log a sale and auto-update item status</div>
          </Link>
        </div>
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total mileage (your entries)</div>
          <div className="mt-2 text-2xl font-bold">{totalMiles.toLocaleString()} mi</div>
        </div>
      </main>
    </div>
  );
}