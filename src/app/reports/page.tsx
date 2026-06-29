import { and, eq, sql } from 'drizzle-orm';
import AppShell from '@/components/app-shell';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { canViewAllData, currentUserId } from '@/lib/auth-utils';
import { calculateProfit, calculateNetRevenue } from '@/lib/financial';
import { ALL_STATUSES, PLATFORM_LABELS } from '@/lib/constants';
import type { ItemStatus, Platform } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const params = await searchParams;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string') sp.set(k, v); else if (Array.isArray(v) && v[0]) sp.set(k, v[0]);
  }
  const startTs = sp.get('startDate') ? new Date(sp.get('startDate') as string).getTime() / 1000 : null;
  const endTs = sp.get('endDate') ? new Date(sp.get('endDate') as string).getTime() / 1000 : null;
  const uid = currentUserId(session);
  const viewAll = canViewAllData(session);

  const invWhere = viewAll ? undefined : eq(items.ownerId, uid);
  const saleConds = [];
  if (!viewAll) saleConds.push(eq(sales.soldBy, uid));
  if (startTs) saleConds.push(sql`${sales.soldDate} >= ${Math.floor(startTs as number)}`);
  if (endTs) saleConds.push(sql`${sales.soldDate} <= ${Math.floor(endTs as number)}`);
  const saleWhere = saleConds.length ? and(...saleConds) : undefined;

  const saleRows = db.query.sales.findMany({ where: saleWhere, with: { item: true } }).sync();
  const profitInputs = saleRows.map((s) => ({
    soldPrice: Number(s.soldPrice), shippingCollected: s.shippingCollected ?? 0, salesTax: s.salesTax ?? 0,
    platformFees: s.platformFees ?? 0, refundAmount: s.refundAmount ?? 0,
    purchasePrice: s.item ? Number(s.item.purchasePrice) : 0, shippingCost: s.shippingCost ?? 0,
  }));
  const totalProfit = profitInputs.reduce((sum, p) => sum + calculateProfit(p), 0);
  const totalNetRevenue = profitInputs.reduce((sum, p) => sum + calculateNetRevenue(p), 0);
  const totalRefunds = saleRows.reduce((s, r) => s + Number(r.refundAmount ?? 0), 0);

  const byPlatform = new Map<Platform, { count: number; revenue: number; profit: number }>();
  saleRows.forEach((s, i) => {
    const plat = s.platform as Platform;
    const cur = byPlatform.get(plat) ?? { count: 0, revenue: 0, profit: 0 };
    cur.count += 1; cur.revenue += Number(s.soldPrice) + Number(s.shippingCollected ?? 0);
    cur.profit += calculateProfit(profitInputs[i]);
    byPlatform.set(plat, cur);
  });

  const invCount = db.select({ c: sql<number>`COUNT(*)` }).from(items).where(invWhere).get()?.c ?? 0;
  const invValue = db.select({ v: sql<number>`COALESCE(SUM(${items.purchasePrice}),0)` }).from(items).where(invWhere).get()?.v ?? 0;
  const byStatus: Record<string, number> = {};
  for (const s of ALL_STATUSES) byStatus[s] = 0;
  for (const r of db.select({ status: items.status }).from(items).where(invWhere).all()) byStatus[r.status as ItemStatus] = (byStatus[r.status as ItemStatus] ?? 0) + 1;

  const mileWhere = viewAll ? undefined : eq(mileage.ownerId, uid);
  const totalMiles = db.select({ m: sql<number>`COALESCE(SUM(${mileage.miles}),0)` }).from(mileage).where(mileWhere).get()?.m ?? 0;

  const stats = [
    { label: 'Total profit', value: formatCurrency(totalProfit), tone: totalProfit >= 0 ? 'text-green-600' : 'text-red-600' },
    { label: 'Net revenue', value: formatCurrency(totalNetRevenue) },
    { label: 'Sales count', value: String(saleRows.length) },
    { label: 'Total refunds', value: formatCurrency(totalRefunds) },
    { label: 'Inventory value', value: formatCurrency(invValue) },
    { label: 'Inventory items', value: String(invCount) },
    { label: 'Miles logged', value: Number(totalMiles).toFixed(1) },
  ];

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-6">Reports</h1>
      <form className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 flex flex-wrap gap-2">
        <input type="date" name="startDate" defaultValue={sp.get('startDate') || ''} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white" />
        <input type="date" name="endDate" defaultValue={sp.get('endDate') || ''} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white" />
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm">Filter</button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.tone || ''}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="font-semibold mb-3">Sales by platform</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500"><tr><th className="py-1">Platform</th><th>Sales</th><th>Revenue</th><th>Profit</th></tr></thead>
            <tbody>
              {Array.from(byPlatform.entries()).length === 0 && <tr><td colSpan={4} className="text-gray-500 py-2">No sales.</td></tr>}
              {Array.from(byPlatform.entries()).map(([plat, v]) => (
                <tr key={plat} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-2">{PLATFORM_LABELS[plat]}</td><td>{v.count}</td>
                  <td>{formatCurrency(v.revenue)}</td><td className={v.profit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(v.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="font-semibold mb-3">Inventory by status</h2>
          <table className="w-full text-sm">
            <tbody>
              {ALL_STATUSES.map((s) => (
                <tr key={s} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-2 capitalize">{s}</td><td className="text-right">{byStatus[s] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}