import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sales, items, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { canViewAllData } from "@/lib/auth-utils";
import { calculateProfit } from "@/lib/financial";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PLATFORM_LABELS, REFUND_TYPE_LABELS, type Platform, type RefundType } from "@/lib/constants";
import Header from "@/components/header";
import SaleDetailActions from "./SaleDetailActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SaleDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const saleId = Number(id);
  if (!Number.isFinite(saleId)) notFound();

  const sale = await db.query.sales.findFirst({ where: eq(sales.id, saleId) });
  if (!sale) notFound();
  if (sale.soldBy !== Number(session.user.id) && !canViewAllData(session)) notFound();

  const item = sale.itemId
    ? await db.query.items.findFirst({ where: eq(items.id, sale.itemId) })
    : null;
  const seller = await db.query.users.findFirst({ where: eq(users.id, sale.soldBy) });

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
    <div className="min-h-screen">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Sale #{sale.id}</h1>
            <p className="text-sm text-gray-500">{formatDate(sale.soldDate)}</p>
          </div>
          <div className={"text-2xl font-bold " + (profit >= 0 ? "text-green-600" : "text-red-600")}>
            {formatCurrency(profit)}
          </div>
        </div>

        <SaleDetailActions
          saleId={sale.id}
          canRefund={sale.soldBy === Number(session.user.id) || session.user.role === "admin"}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="font-semibold mb-2">Sale Details</h2>
            <dl className="text-sm space-y-1">
              <Row k="Item" v={item ? `${item.name} (#${item.id})` : "—"} />
              <Row k="Platform" v={PLATFORM_LABELS[sale.platform as Platform] ?? sale.platform} />
              <Row k="Sold Price" v={formatCurrency(sale.soldPrice)} />
              <Row k="Sales Tax" v={formatCurrency(sale.salesTax ?? 0)} />
              <Row k="Shipping Cost" v={formatCurrency(sale.shippingCost ?? 0)} />
              <Row k="Shipping Collected" v={formatCurrency(sale.shippingCollected ?? 0)} />
              <Row k="Platform Fees" v={formatCurrency(sale.platformFees ?? 0)} />
              <Row k="Sold By" v={seller?.name ?? "—"} />
            </dl>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="font-semibold mb-2">Refund</h2>
            {sale.refundAmount && sale.refundAmount > 0 ? (
              <dl className="text-sm space-y-1">
                <Row k="Type" v={REFUND_TYPE_LABELS[sale.refundType as RefundType] ?? sale.refundType} />
                <Row k="Amount" v={formatCurrency(sale.refundAmount)} />
                <Row k="Reason" v={sale.refundReason ?? "—"} />
              </dl>
            ) : (
              <p className="text-sm text-gray-500">No refund issued.</p>
            )}
          </div>
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
