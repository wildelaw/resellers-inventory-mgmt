import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items, photos, sales } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { canViewAllData } from "@/lib/auth-utils";
import { calculateProfit } from "@/lib/financial";
import { formatCurrency, formatDate, getPhotoUrl, statusColor } from "@/lib/utils";
import { STATUS_LABELS, type ItemStatus } from "@/lib/constants";
import Header from "@/components/header";
import ItemDetailActions from "./ItemDetailActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) notFound();

  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) notFound();
  if (item.ownerId !== Number(session.user.id) && !canViewAllData(session)) notFound();

  const itemPhotos = await db.select().from(photos).where(eq(photos.itemId, itemId));
  const itemSales = await db.select().from(sales).where(eq(sales.itemId, itemId));

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">{item.name}</h1>
            <p className="text-sm text-gray-500">{item.category ?? "Uncategorized"}</p>
          </div>
          <span
            className={
              "px-3 py-1 rounded text-sm font-medium capitalize " + statusColor(item.status)
            }
          >
            {STATUS_LABELS[item.status as ItemStatus] ?? item.status}
          </span>
        </div>

        <ItemDetailActions itemId={item.id} status={item.status} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="font-semibold mb-2">Details</h2>
            <dl className="text-sm space-y-1">
              <Row k="Purchase Date" v={formatDate(item.purchaseDate)} />
              <Row k="Purchase Price" v={formatCurrency(item.purchasePrice)} />
              <Row k="Location" v={item.purchaseLocation ?? "—"} />
              <Row k="Removal Date" v={item.removalDate ? formatDate(item.removalDate) : "—"} />
              <Row k="Created" v={formatDate(item.createdAt)} />
            </dl>
            {item.description && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
            )}
            {item.notes && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                <span className="font-medium">Notes:</span> {item.notes}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="font-semibold mb-2">Photos ({itemPhotos.length})</h2>
            {itemPhotos.length === 0 ? (
              <p className="text-sm text-gray-500">No photos yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {itemPhotos.map((p) => (
                  <a
                    key={p.id}
                    href={getPhotoUrl(item.id, p.filename)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={getPhotoUrl(item.id, p.filename)}
                      alt=""
                      className="w-full h-24 object-cover rounded"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-4">
          <h2 className="font-semibold mb-2">Sales ({itemSales.length})</h2>
          {itemSales.length === 0 ? (
            <p className="text-sm text-gray-500">No sales yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1">Date</th>
                  <th className="py-1 text-right">Sold</th>
                  <th className="py-1 text-right">Fees</th>
                  <th className="py-1 text-right">Refund</th>
                  <th className="py-1 text-right">Profit</th>
                  <th className="py-1">Platform</th>
                </tr>
              </thead>
              <tbody>
                {itemSales.map((s) => {
                  const profit = calculateProfit({
                    soldPrice: s.soldPrice,
                    shippingCollected: s.shippingCollected ?? 0,
                    salesTax: s.salesTax ?? 0,
                    platformFees: s.platformFees ?? 0,
                    refundAmount: s.refundAmount ?? 0,
                    purchasePrice: item.purchasePrice,
                    shippingCost: s.shippingCost ?? 0,
                  });
                  return (
                    <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="py-1">
                        <Link href={`/sales/${s.id}`} className="hover:underline">
                          {formatDate(s.soldDate)}
                        </Link>
                      </td>
                      <td className="py-1 text-right">{formatCurrency(s.soldPrice)}</td>
                      <td className="py-1 text-right">{formatCurrency(s.platformFees ?? 0)}</td>
                      <td className="py-1 text-right">{formatCurrency(s.refundAmount ?? 0)}</td>
                      <td className={"py-1 text-right " + (profit >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatCurrency(profit)}
                      </td>
                      <td className="py-1 capitalize">{s.platform}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
