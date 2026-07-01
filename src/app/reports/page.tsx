import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { canViewAllData } from '@/lib/auth-utils';
import { calculateProfit } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';
import { ALL_STATUSES, STATUS_LABELS, PLATFORM_LABELS } from '@/lib/constants';
import Header from '@/components/header';

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const viewAll = canViewAllData(session);
  const userId = parseInt(session.user.id, 10);

  const itemConditions = viewAll ? undefined : eq(items.ownerId, userId);
  const saleConditions = viewAll ? undefined : eq(sales.soldBy, userId);

  const allItems = await db.query.items.findMany({ where: itemConditions });
  const allSales = await db.query.sales.findMany({ where: saleConditions, with: { item: true } });

  const totalProfit = allSales.reduce((sum, s) => sum + calculateProfit({
    soldPrice: s.soldPrice,
    shippingCollected: s.shippingCollected,
    salesTax: s.salesTax,
    platformFees: s.platformFees,
    refundAmount: s.refundAmount,
    purchasePrice: s.item?.purchasePrice ?? 0,
    shippingCost: s.shippingCost,
  }), 0);

  const totalRevenue = allSales.reduce((sum, s) => sum + s.soldPrice, 0);

  const inventoryStats: Record<string, number> = {};
  for (const status of ALL_STATUSES) {
    inventoryStats[status] = allItems.filter((i) => i.status === status).length;
  }

  const salesByPlatform: Record<string, number> = {};
  for (const s of allSales) {
    salesByPlatform[s.platform] = (salesByPlatform[s.platform] || 0) + s.soldPrice;
  }

  return (
    <div>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Reports</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Total Profit</p>
            <p className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totalProfit)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Total Sales</p>
            <p className="text-3xl font-bold">{allSales.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Total Items</p>
            <p className="text-3xl font-bold">{allItems.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Inventory by Status</h2>
            <div className="space-y-2">
              {ALL_STATUSES.map((s) => (
                <div key={s} className="flex justify-between">
                  <span>{STATUS_LABELS[s]}</span>
                  <span className="font-semibold">{inventoryStats[s]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Sales by Platform</h2>
            <div className="space-y-2">
              {Object.entries(salesByPlatform).map(([platform, revenue]) => (
                <div key={platform} className="flex justify-between">
                  <span>{PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS] || platform}</span>
                  <span className="font-semibold">{formatCurrency(revenue)}</span>
                </div>
              ))}
              {Object.keys(salesByPlatform).length === 0 && <p className="text-gray-500">No sales data</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}