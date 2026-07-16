import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { withAuth, validateOriginOrReferer } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { sales, items, users } from "@/lib/schema";
import { updateSaleSchema } from "@/lib/validations";
import { canEditOthersData, canViewAllData } from "@/lib/auth-utils";
import { ApiErrors } from "@/lib/api-errors";

export const GET = withAuth(async (_req, ctx, session) => {
  const { id } = await ctx.params;
  const saleId = Number(id);
  if (!Number.isFinite(saleId)) throw ApiErrors.BadRequest("Invalid id");

  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
  });
  if (!sale) throw ApiErrors.NotFound("Sale");

  if (sale.soldBy !== Number(session.user.id) && !canViewAllData(session)) {
    throw ApiErrors.NotFound("Sale");
  }

  const item = sale.itemId
    ? await db.query.items.findFirst({ where: eq(items.id, sale.itemId) })
    : null;
  const seller = await db.query.users.findFirst({
    where: eq(users.id, sale.soldBy),
  });

  return NextResponse.json({
    ...sale,
    item,
    seller: seller
      ? { id: seller.id, name: seller.name, email: seller.email }
      : null,
  });
});

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const saleId = Number(id);
  if (!Number.isFinite(saleId)) throw ApiErrors.BadRequest("Invalid id");

  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
  });
  if (!sale) throw ApiErrors.NotFound("Sale");

  if (sale.soldBy !== Number(session.user.id) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const body = await req.json();
  const data = updateSaleSchema.parse(body);

  const updates: Record<string, unknown> = {};
  if (data.soldDate !== undefined) updates.soldDate = data.soldDate;
  if (data.soldPrice !== undefined) updates.soldPrice = data.soldPrice;
  if (data.shippingCost !== undefined) updates.shippingCost = data.shippingCost;
  if (data.shippingCollected !== undefined) updates.shippingCollected = data.shippingCollected;
  if (data.platform !== undefined) updates.platform = data.platform;
  if (data.salesTax !== undefined) updates.salesTax = data.salesTax;
  if (data.platformFees !== undefined) updates.platformFees = data.platformFees;

  const updated = await db
    .update(sales)
    .set(updates as never)
    .where(eq(sales.id, saleId))
    .returning();

  return NextResponse.json(updated[0]);
});

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const saleId = Number(id);
  if (!Number.isFinite(saleId)) throw ApiErrors.BadRequest("Invalid id");

  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
  });
  if (!sale) throw ApiErrors.NotFound("Sale");

  if (sale.soldBy !== Number(session.user.id) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const now = Math.floor(Date.now() / 1000);
  await db.delete(sales).where(eq(sales.id, saleId));

  if (sale.itemId) {
    const item = await db.query.items.findFirst({ where: eq(items.id, sale.itemId) });
    if (item && (item.status === "sold" || item.status === "returned")) {
      await db
        .update(items)
        .set({ status: "available", removalDate: null, updatedAt: now })
        .where(eq(items.id, sale.itemId));
    }
  }

  return NextResponse.json({ success: true });
});
