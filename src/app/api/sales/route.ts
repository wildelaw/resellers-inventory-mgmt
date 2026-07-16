import { NextResponse, type NextRequest } from "next/server";
import { and, desc, asc, eq, gte, lte, like, or, sql } from "drizzle-orm";
import { withAuth, parsePagination, parseSortParams, escapeLike, buildPaginationResponse, validateOriginOrReferer } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { sales, items, users } from "@/lib/schema";
import { canViewAllData } from "@/lib/auth-utils";
import { createSaleSchema, updateRefundSchema } from "@/lib/validations";
import { ApiErrors } from "@/lib/api-errors";

export const GET = withAuth(async (req, _ctx, session) => {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const { page, pageSize, offset, limit } = parsePagination(sp);
  const { sortBy, sortOrder } = parseSortParams(
    sp,
    ["createdAt", "soldDate", "soldPrice"],
    "soldDate"
  );

  const filters = [] as ReturnType<typeof eq>[];
  if (!canViewAllData(session)) {
    filters.push(eq(sales.soldBy, Number(session.user.id)));
  } else {
    const soldBy = sp.get("soldBy");
    if (soldBy) filters.push(eq(sales.soldBy, Number(soldBy)));
  }
  const platform = sp.get("platform");
  if (platform) filters.push(eq(sales.platform, platform as never));
  const startDate = sp.get("startDate");
  if (startDate) {
    const t = Math.floor(new Date(startDate).getTime() / 1000);
    if (!isNaN(t)) filters.push(gte(sales.soldDate, t));
  }
  const endDate = sp.get("endDate");
  if (endDate) {
    const t = Math.floor(new Date(endDate).getTime() / 1000);
    if (!isNaN(t)) filters.push(lte(sales.soldDate, t));
  }
  const search = sp.get("search");
  if (search) {
    const term = `%${escapeLike(search)}%`;
    filters.push(
      or(
        like(sales.platform, term),
        like(sales.refundReason, term)
      )!
    );
  }

  const where = filters.length ? and(...filters) : undefined;
  const sortCol = sales[sortBy as keyof typeof sales] ?? sales.soldDate;
  const orderBy = sortOrder === "asc" ? asc : desc;

  const list = await db
    .select({
      sale: sales,
      item: items,
      seller: { id: users.id, name: users.name, email: users.email },
    })
    .from(sales)
    .leftJoin(items, eq(sales.itemId, items.id))
    .leftJoin(users, eq(sales.soldBy, users.id))
    .where(where)
    .orderBy(orderBy(sortCol as never))
    .limit(limit)
    .offset(offset);

  const totalRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(sales)
    .where(where);
  const total = totalRow[0]?.count ?? 0;

  return NextResponse.json({
    items: list.map((r) => ({ ...r.sale, item: r.item, seller: r.seller })),
    pagination: buildPaginationResponse(total, page, pageSize),
  });
});

export const POST = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const data = createSaleSchema.parse(body);

  const ownerId = Number(session.user.id);

  let item: typeof items.$inferSelect | null = null;
  if (data.itemId) {
    const found = await db.query.items.findFirst({
      where: eq(items.id, data.itemId),
    });
    if (!found) throw ApiErrors.NotFound("Item");
    if (found.status === "sold" || found.status === "donated" || found.status === "discarded") {
      throw ApiErrors.Conflict(`Item is already ${found.status}`);
    }
    if (found.ownerId !== ownerId && session.user.role !== "admin" && !session.user.canViewAll) {
      throw ApiErrors.Forbidden();
    }
    item = found;
  } else if (data.itemName) {
    const existing = await db.query.items.findFirst({
      where: eq(items.name, data.itemName),
    });
    if (existing) {
      item = existing;
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const inserted = await db
    .insert(sales)
    .values({
      itemId: item?.id ?? null,
      soldDate: data.soldDate,
      soldPrice: data.soldPrice,
      shippingCost: data.shippingCost ?? null,
      shippingCollected: data.shippingCollected ?? 0,
      platform: data.platform as never,
      salesTax: data.salesTax ?? null,
      platformFees: data.platformFees ?? 0,
      refundAmount: 0,
      refundReason: null,
      refundType: "none",
      soldBy: ownerId,
      createdAt: now,
    })
    .returning();

  if (item) {
    await db
      .update(items)
      .set({
        status: "sold",
        removalDate: data.soldDate,
        updatedAt: now,
      })
      .where(eq(items.id, item.id));
  }

  return NextResponse.json(inserted[0], { status: 201 });
});

export const PATCH = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const data = updateRefundSchema.parse(body);

  const sale = await db.query.sales.findFirst({ where: eq(sales.id, data.saleId) });
  if (!sale) throw ApiErrors.NotFound("Sale");

  if (sale.soldBy !== Number(session.user.id) && session.user.role !== "admin") {
    throw ApiErrors.Forbidden();
  }

  const now = Math.floor(Date.now() / 1000);

  const updated = await db
    .update(sales)
    .set({
      refundAmount: data.refundAmount,
      refundReason: data.refundReason ?? null,
      refundType: data.refundType as never,
    })
    .where(eq(sales.id, data.saleId))
    .returning();

  if (data.refundType === "refund_with_return" && sale.itemId) {
    await db
      .update(items)
      .set({ status: "returned", removalDate: null, updatedAt: now })
      .where(eq(items.id, sale.itemId));
  }

  return NextResponse.json(updated[0]);
});
