import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mileage } from "@/lib/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import Header from "@/components/header";
import MileageActions from "./MileageActions";

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}

export default async function MileagePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page || "1"), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(sp.pageSize || "20"), 10)));
  const offset = (page - 1) * pageSize;
  const ownerId = Number(session.user.id);

  const filters = [eq(mileage.ownerId, ownerId)];
  if (sp.startDate) {
    const t = Math.floor(new Date(String(sp.startDate)).getTime() / 1000);
    if (!isNaN(t)) filters.push(gte(mileage.date, t));
  }
  if (sp.endDate) {
    const t = Math.floor(new Date(String(sp.endDate)).getTime() / 1000);
    if (!isNaN(t)) filters.push(lte(mileage.date, t));
  }

  const where = and(...filters);
  const list = await db
    .select()
    .from(mileage)
    .where(where)
    .orderBy(desc(mileage.date))
    .limit(pageSize)
    .offset(offset);

  const totalRow = await db.select({ count: sql<number>`count(*)` }).from(mileage).where(where);
  const total = Number(totalRow[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const totals = await db
    .select({ total: sql<number>`COALESCE(SUM(${mileage.miles}), 0)` })
    .from(mileage)
    .where(where);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Mileage</h1>
          <div className="flex gap-2">
            <a
              href="/api/mileage/export"
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm"
            >
              Export CSV
            </a>
            <Link
              href="/mileage/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
            >
              + New Entry
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
          <div className="text-sm text-gray-500">Total Miles (filtered)</div>
          <div className="text-2xl font-bold">{Number(totals[0]?.total ?? 0).toFixed(1)}</div>
        </div>

        <form className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3">
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
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
            Filter
          </button>
        </form>

        <MileageActions initial={{ items: list, pagination: { page, pageSize, total, totalPages } }} />
      </main>
    </div>
  );
}
