import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { canViewAllData } from '@/lib/auth-utils';
import Header from '@/components/header';
import { calculateProfit } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';
import { PLATFORM_LABELS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const sp = new URLSearchParams();
  const params = await searchParams;
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else if (v !== undefined) sp.set(k, v);
  }

  const startParam = sp.get('startDate');
  const endParam = sp.get('endDate');
  const startDate = startParam ? new Date(`${startParam}T00:00:00`).getTime() : null;
  const endDate = endParam ? new Date(`${endParam}T00:00:00`).getTime() : null;

  // Inventory stats (no date filter — current state)
  const itemWhere = canViewAllData(session) ? undefined : eq(items.ownerId, Number(session.user.id));
  const itemRows = itemWhere ? db.select().from(items).where(itemWhere).all() : db.select().from(items).all();

  // Sales stats with date filter
  const saleConditions = [];
  if (!canViewAllData(session)) saleConditions.push(eq(sales.soldBy, Number(session.user.id)));
  if (startDate !== null) saleConditions.push(gte(sales.soldDate, startDate));
  if (endDate !== null) saleConditions.push(lte(sales.soldDate, endDate));
  const saleWhere = saleConditions.length > 0 ? and(...saleConditions) : undefined;
  const saleRows = saleWhere ? db.select().from(sales).where(saleWhere).all() : db.select().from(sales).all();

  const itemIdToPurchase = new Map<number, number>();
  for (const item of itemRows) itemIdToPurchase.set(item.id, item.purchasePrice);

  let totalProfit = 0;
  let totalNetRevenue = 0;
  const platformBreakdown: Record<string, { count: number; profit: number }> = {};
  for (const sale of saleRows) {
    const purchase = sale.itemId ? (itemIdToPurchase.get(sale.itemId) ?? 0) : 0;
    const profit = calculateProfit({
      soldPrice: sale.soldPrice, shippingCollected: sale.shippingCollected, salesTax: sale.salesTax,
      platformFees: sale.platformFees, refundAmount: sale.refundAmount, shippingCost: sale.shippingCost,
      purchasePrice: purchase,
    });
    totalProfit += profit;
    totalNetRevenue += sale.soldPrice + (sale.shippingCollected ?? 0) - (sale.refundAmount ?? 0);
    const key = sale.platform;
    platformBreakdown[key] ??= { count: 0, profit: 0 };
    platformBreakdown[key].count += 1;
    platformBreakdown[key].profit += profit;
  }

  const mileageRows = db.select().from(mileage).where(eq(mileage.ownerId, Number(session.user.id))).all();

  const stats = [
    { label: 'Total sales', value: String(saleRows.length) },
    { label: 'Net revenue', value: formatCurrency(totalNetRevenue) },
    { label: 'Total profit', value: formatCurrency(totalProfit) },
    { label: 'Total miles', value: mileageRows.reduce((s, r) => s + r.miles, 0).toLocaleString() + ' mi' },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <h1 className="text-3xl font-bold">Reports</h1>
          <form className="flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
              <input type="date" name="startDate" defaultValue={startParam ?? ''} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
              <input type="date" name="endDate" defaultValue={endParam ?? ''} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">Apply</button>
          </form>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400">{s.label}</div>
              <div className="mt-2 text-2xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Sales by platform</h2>
          {Object.keys(platformBreakdown).length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">No sales in range.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {Object.entries(platformBreakdown).map(([platform, data]) => (
                  <tr key={platform}>
                    <td className="px-3 py-2 text-sm">{PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS] ?? platform}</td>
                    <td className="px-3 py-2 text-sm">{data.count}</td>
                    <td className="px-3 py-2 text-sm font-medium">{formatCurrency(data.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}