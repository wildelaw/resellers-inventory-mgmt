import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items, sales, mileage, appConfig } from "@/lib/schema";
import { sql, eq, and, gte, desc } from "drizzle-orm";
import { calculateProfit, calculateNetRevenue, type ProfitInput } from "@/lib/financial";
import { canViewAllData } from "@/lib/auth-utils";
import { formatCurrency } from "@/lib/utils";
import Header from "@/components/header";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const ownerId = Number(session.user.id);
  const isViewAll = canViewAllData(session);

  const now = Math.floor(Date.now() / 1000);
  const monthStart = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);

  const itemFilters = isViewAll ? undefined : eq(items.ownerId, ownerId);
  const saleFilters = isViewAll
    ? gte(sales.soldDate, monthStart)
    : and(eq(sales.soldBy, ownerId), gte(sales.soldDate, monthStart));

  const invAgg = await db
    .select({
      total: sql<number>`count(*)`,
      available: sql<number>`SUM(CASE WHEN status='available' THEN 1 ELSE 0 END)`,
      listed: sql<number>`SUM(CASE WHEN status='listed' THEN 1 ELSE 0 END)`,
      sold: sql<number>`SUM(CASE WHEN status='sold' THEN 1 ELSE 0 END)`,
      invested: sql<number>`COALESCE(SUM(purchase_price), 0)`,
    })
    .from(items)
    .where(itemFilters);

  const monthSales = await db
    .select({ sale: sales, item: items })
    .from(sales)
    .leftJoin(items, eq(sales.itemId, items.id))
    .where(saleFilters);

  let monthProfit = 0;
  let monthRevenue = 0;
  for (const r of monthSales) {
    const input: ProfitInput = {
      soldPrice: r.sale.soldPrice,
      shippingCollected: r.sale.shippingCollected ?? 0,
      salesTax: r.sale.salesTax ?? 0,
      platformFees: r.sale.platformFees ?? 0,
      refundAmount: r.sale.refundAmount ?? 0,
      purchasePrice: r.item?.purchasePrice ?? 0,
      shippingCost: r.sale.shippingCost ?? 0,
    };
    monthProfit += calculateProfit(input);
    monthRevenue += calculateNetRevenue(input);
  }

  const settings = await db.query.appConfig.findFirst();
  const companyName = settings?.companyName || "Resale Manager";

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Welcome back, {session.user.name}!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Items" value={String(Number(invAgg[0]?.total ?? 0))} />
          <StatCard label="Available" value={String(Number(invAgg[0]?.available ?? 0))} />
          <StatCard label="Invested" value={formatCurrency(Number(invAgg[0]?.invested ?? 0))} />
          <StatCard label="This Month Profit" value={formatCurrency(monthProfit)} highlight />
          <StatCard label="This Month Revenue" value={formatCurrency(monthRevenue)} />
          <StatCard label="Items Listed" value={String(Number(invAgg[0]?.listed ?? 0))} />
          <StatCard label="Items Sold" value={String(Number(invAgg[0]?.sold ?? 0))} />
          <StatCard label="Month Sales Count" value={String(monthSales.length)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/inventory/new"
            className="block p-6 rounded-lg bg-white dark:bg-gray-800 shadow hover:shadow-md transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-1">Add Inventory Item</h3>
            <p className="text-sm text-gray-500">Track a new purchase.</p>
          </Link>
          <Link
            href="/sales/new"
            className="block p-6 rounded-lg bg-white dark:bg-gray-800 shadow hover:shadow-md transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-1">Record Sale</h3>
            <p className="text-sm text-gray-500">Log a sale with platform, fees, and tax.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={
        "p-4 rounded-lg shadow " +
        (highlight
          ? "bg-green-50 dark:bg-green-900/20"
          : "bg-white dark:bg-gray-800")
      }
    >
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className={"text-2xl font-bold " + (highlight ? "text-green-600" : "")}>{value}</div>
    </div>
  );
}
