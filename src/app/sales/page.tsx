import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sales, items, users } from "@/lib/schema";
import { canViewAllData } from "@/lib/auth-utils";
import { desc, eq, and, gte, lte, sql, or, like, inArray } from "drizzle-orm";
import { escapeLike } from "@/lib/api-utils";
import { calculateProfit } from "@/lib/financial";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ALL_PLATFORMS, PLATFORM_LABELS, type Platform } from "@/lib/constants";
import Header from "@/components/header";

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}

export default async function SalesListPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page || "1"), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(sp.pageSize || "20"), 10)));
  const offset = (page - 1) * pageSize;

  const filters = [] as ReturnType<typeof eq>[];
  if (!canViewAllData(session)) {
    filters.push(eq(sales.soldBy, Number(session.user.id)));
  }
  if (sp.platform) filters.push(eq(sales.platform, sp.platform as never));
  if (sp.startDate) {
    const t = Math.floor(new Date(String(sp.startDate)).getTime() / 1000);
    if (!isNaN(t)) filters.push(gte(sales.soldDate, t));
  }
  if (sp.endDate) {
    const t = Math.floor(new Date(String(sp.endDate)).getTime() / 1000);
    if (!isNaN(t)) filters.push(lte(sales.soldDate, t));
  }
  if (sp.search) {
    const term = `%${escapeLike(String(sp.search))}%`;
    filters.push(or(like(sales.platform, term), like(sales.refundReason, term))!);
  }
  const where = filters.length ? and(...filters) : undefined;

  const list = await db
    .select({ sale: sales, item: items })
    .from(sales)
    .leftJoin(items, eq(sales.itemId, items.id))
    .where(where)
    .orderBy(desc(sales.soldDate))
    .limit(pageSize)
    .offset(offset);

  const totalRow = await db.select({ count: sql<number>`count(*)` }).from(sales).where(where);
  const total = Number(totalRow[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Sales</h1>
          <Link
            href="/sales/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
          >
            + Record Sale
          </Link>
        </div>

        <form className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3">
          <input
            type="text"
            name="search"
            placeholder="Search..."
            defaultValue={String(sp.search || "")}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 text-sm"
          />
          <select
            name="platform"
            defaultValue={String(sp.platform || "")}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 text-sm"
          >
            <option value="">All platforms</option>
            {ALL_PLATFORMS.map((p: Platform) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="startDate"
            defaultValue={String(sp.startDate || "")}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 text-sm"
          />
          <input
            type="date"
            name="endDate"
            defaultValue={String(sp.endDate || "")}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 text-sm"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
          >
            Filter
          </button>
        </form>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Platform</th>
                <th className="px-3 py-2 text-right">Sold</th>
                <th className="px-3 py-2 text-right">Fees</th>
                <th className="px-3 py-2 text-right">Refund</th>
                <th className="px-3 py-2 text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    No sales found.
                  </td>
                </tr>
              )}
              {list.map(({ sale, item }) => {
                const profit = calculateProfit({
                  soldPrice: sale.soldPrice,
                  shippingCollected: sale.shippingCollected ?? 0,
                  salesTax: sale.salesTax ?? 0,
                  platformFees: sale.platformFees ?? 0,
                  refundAmount: sale.refundAmount ?? 0,
                  purchasePrice: item?.purchasePrice ?? 0,
                  shippingCost: sale.shippingCost ?? 0,
                });
                return (
                  <tr key={sale.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-3 py-2">
                      <Link href={`/sales/${sale.id}`} className="hover:underline">
                        {formatDate(sale.soldDate)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{item?.name ?? "—"}</td>
                    <td className="px-3 py-2 capitalize">{sale.platform}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(sale.soldPrice)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(sale.platformFees ?? 0)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(sale.refundAmount ?? 0)}</td>
                    <td className={"px-3 py-2 text-right " + (profit >= 0 ? "text-green-600" : "text-red-600")}>
                      {formatCurrency(profit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4 text-sm">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/sales?page=${p}`}
                className={
                  "px-3 py-1 rounded " +
                  (p === page
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700")
                }
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
