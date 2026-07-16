import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { withAuth, validateOriginOrReferer } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { items, sales, photos } from "@/lib/schema";
import { updateItemSchema } from "@/lib/validations";
import { canViewAllData, canEditOthersData } from "@/lib/auth-utils";
import { isValidTransition } from "@/lib/constants";
import { ApiErrors } from "@/lib/api-errors";

export const GET = withAuth(async (_req, ctx, session) => {
  const { id } = await ctx.params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) throw ApiErrors.BadRequest("Invalid id");

  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
  });
  if (!item) throw ApiErrors.NotFound("Item");

  const ownerId = Number(session.user.id);
  if (item.ownerId !== ownerId && !canViewAllData(session)) {
    throw ApiErrors.NotFound("Item");
  }

  const itemPhotos = await db.select().from(photos).where(eq(photos.itemId, itemId));
  const itemSales = await db.select().from(sales).where(eq(sales.itemId, itemId));

  return NextResponse.json({
    ...item,
    photos: itemPhotos,
    sales: itemSales,
  });
});

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) throw ApiErrors.BadRequest("Invalid id");

  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
  });
  if (!item) throw ApiErrors.NotFound("Item");

  const ownerId = Number(session.user.id);
  if (item.ownerId !== ownerId && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const body = await req.json();
  const data = updateItemSchema.parse(body);

  const now = Math.floor(Date.now() / 1000);
  const updates: Record<string, unknown> = { updatedAt: now };

  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.purchaseDate !== undefined) updates.purchaseDate = data.purchaseDate;
  if (data.purchasePrice !== undefined) updates.purchasePrice = data.purchasePrice;
  if (data.purchaseLocation !== undefined) updates.purchaseLocation = data.purchaseLocation;
  if (data.category !== undefined) updates.category = data.category;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.metadata !== undefined) updates.metadata = JSON.stringify(data.metadata);

  if (data.status !== undefined && data.status !== item.status) {
    if (!isValidTransition(item.status, data.status as never)) {
      throw ApiErrors.BadRequest(
        `Invalid status transition from ${item.status} to ${data.status}`
      );
    }
    updates.status = data.status;
    if (data.status === "donated" || data.status === "discarded") {
      updates.removalDate = now;
    }
    if (item.status === "returned" && data.status === "available") {
      updates.removalDate = null;
    }
  }

  const updated = await db
    .update(items)
    .set(updates as never)
    .where(eq(items.id, itemId))
    .returning();

  return NextResponse.json(updated[0]);
});

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) throw ApiErrors.BadRequest("Invalid id");

  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
  });
  if (!item) throw ApiErrors.NotFound("Item");

  const ownerId = Number(session.user.id);
  if (item.ownerId !== ownerId && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  await db.delete(items).where(eq(items.id, itemId));
  return NextResponse.json({ success: true });
});
