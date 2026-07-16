import { NextResponse, type NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { withAuth, validateOriginOrReferer } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { items, photos, sales } from "@/lib/schema";
import { bulkStatusSchema, bulkDeleteSchema } from "@/lib/validations";
import { isValidTransition } from "@/lib/constants";
import { ApiErrors } from "@/lib/api-errors";

export const PATCH = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const data = bulkStatusSchema.parse(body);

  const ownerId = Number(session.user.id);
  const targetItems = await db
    .select()
    .from(items)
    .where(inArray(items.id, data.ids));
  if (targetItems.length !== data.ids.length) {
    throw ApiErrors.NotFound("Items");
  }
  for (const it of targetItems) {
    if (it.ownerId !== ownerId && session.user.role !== "admin") {
      throw ApiErrors.Forbidden();
    }
    if (!isValidTransition(it.status, data.status as never)) {
      throw ApiErrors.BadRequest(
        `Invalid status transition from ${it.status} to ${data.status} for item ${it.id}`
      );
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const updateValues: Record<string, unknown> = {
    status: data.status,
    updatedAt: now,
  };
  if (data.status === "donated" || data.status === "discarded") {
    updateValues.removalDate = now;
  } else if (data.status === "available") {
    updateValues.removalDate = null;
  }

  await db.update(items).set(updateValues as never).where(inArray(items.id, data.ids));

  return NextResponse.json({ success: true, count: data.ids.length });
});

export const DELETE = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids");
  let ids: number[] = [];
  if (idsParam) {
    ids = idsParam
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  } else {
    const body = await req.json();
    const data = bulkDeleteSchema.parse(body);
    ids = data.ids;
  }

  if (ids.length === 0) {
    throw ApiErrors.BadRequest("No ids provided");
  }

  const ownerId = Number(session.user.id);
  const targetItems = await db
    .select()
    .from(items)
    .where(inArray(items.id, ids));
  for (const it of targetItems) {
    if (it.ownerId !== ownerId && session.user.role !== "admin") {
      throw ApiErrors.Forbidden();
    }
  }

  await db.delete(items).where(inArray(items.id, ids));
  return NextResponse.json({ success: true, count: ids.length });
});
