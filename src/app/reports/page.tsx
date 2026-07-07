import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canViewAllData, sessionUserId } from '@/lib/auth-utils';
import { calculateProfit, calculateNetRevenue } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';
import { PLATFORM_LABELS, ALL_PLATFORMS } from '@/lib/constants';
import Header from '@/components/header';

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const uid = sessionUserId(session);
  const viewAll = canViewAllData(session);

  const allSales = await db.query.sales.findMany({
    where: viewAll ? undefined : ((s, { eq }) => eq(s.soldBy, uid)),
    with: { item: true },
  });

  const enriched = allSales.map((s) => ({ ...s, purchasePrice: s.item?.purchasePrice ?? 0 }));
  const totalProfit = enriched.reduce((sum, s) => sum + calculateProfit(s), 0);
  const totalRevenue = enriched.reduce((sum, s) => sum + s.soldPrice, 0);
  const totalNetRevenue = enriched.reduce((sum, s) => sum + calculateNetRevenue(s), 0);

  const byPlatform: Record<string, { count: number; profit: number }> = {};
  for (const p of ALL_PLATFORMS) byPlatform[p] = { count: 0, profit: 0 };
  for (const s of enriched) {
    if (!byPlatform[s.platform]) byPlatform[s.platform] = { count: 0, profit: 0 };
    byPlatform[s.platform].count += 1;
    byPlatform[s.platform].profit += calculateProfit(s);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Reports</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"><div className="text-sm text-gray-500">Total Revenue</div><div className="text-3xl font-bold mt-1">{formatCurrency(totalRevenue)}</div></div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"><div className="text-sm text-gray-500">Net Revenue</div><div className="text-3xl font-bold mt-1">{formatCurrency(totalNetRevenue)}</div></div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"><div className="text-sm text-gray-500">Total Profit</div><div className={`text-3xl font-bold mt-1 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totalProfit)}</div></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Sales by Platform</h2>
          <table className="w-full text-sm">
            <thead><tr><th className="text-left pb-2">Platform</th><th className="text-left pb-2">Sales</th><th className="text-left pb-2">Profit</th></tr></thead>
            <tbody>
              {Object.entries(byPlatform).filter(([, v]) => v.count > 0).map(([k, v]) => (
                <tr key={k} className="border-t border-gray-200 dark:border-gray-700"><td className="py-2">{PLATFORM_LABELS[k as keyof typeof PLATFORM_LABELS] ?? k}</td><td className="py-2">{v.count}</td><td className={`py-2 ${v.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(v.profit)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
