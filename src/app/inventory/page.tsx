import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items, photos, sales } from "@/lib/schema";
import { canViewAllData } from "@/lib/auth-utils";
import { eq, desc, inArray, sql, and, or, like, gte, lte } from "drizzle-orm";
import { escapeLike } from "@/lib/api-utils";
import { formatCurrency, formatDate, statusColor, getPhotoUrl } from "@/lib/utils";
import { ALL_STATUSES, STATUS_LABELS, type ItemStatus } from "@/lib/constants";
import Header from "@/components/header";
import InventoryActions from "./InventoryActions";

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page || "1"), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(sp.pageSize || "20"), 10)));
  const offset = (page - 1) * pageSize;

  const filters = [] as ReturnType<typeof eq>[];
  if (!canViewAllData(session)) {
    filters.push(eq(items.ownerId, Number(session.user.id)));
  }
  if (sp.status) filters.push(eq(items.status, sp.status as never));
  if (sp.category) filters.push(eq(items.category, String(sp.category)));
  if (sp.search) {
    const term = `%${escapeLike(String(sp.search))}%`;
    filters.push(
      or(
        like(items.name, term),
        like(items.description, term),
        like(items.purchaseLocation, term)
      )!
    );
  }
  if (sp.startDate) {
    const t = Math.floor(new Date(String(sp.startDate)).getTime() / 1000);
    if (!isNaN(t)) filters.push(gte(items.purchaseDate, t));
  }
  if (sp.endDate) {
    const t = Math.floor(new Date(String(sp.endDate)).getTime() / 1000);
    if (!isNaN(t)) filters.push(lte(items.purchaseDate, t));
  }
  const where = filters.length ? and(...filters) : undefined;

  const list = await db
    .select()
    .from(items)
    .where(where)
    .orderBy(desc(items.createdAt))
    .limit(pageSize)
    .offset(offset);

  const ids = list.map((i) => i.id);
  const allPhotos = ids.length
    ? await db.select().from(photos).where(inArray(photos.itemId, ids))
    : [];
  const allSales = ids.length
    ? await db.select().from(sales).where(inArray(sales.itemId, ids))
    : [];

  const totalRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(items)
    .where(where);
  const total = Number(totalRow[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Inventory</h1>
          <Link
            href="/inventory/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
          >
            + New Item
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
            name="status"
            defaultValue={String(sp.status || "")}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 text-sm"
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s: ItemStatus) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
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

        <InventoryActions
          initial={{
            items: list.map((it) => ({
              ...it,
              photos: allPhotos.filter((p) => p.itemId === it.id),
              sales: allSales.filter((s) => s.itemId === it.id),
            })),
            pagination: { page, pageSize, total, totalPages },
          }}
        />
      </main>
    </div>
  );
}
