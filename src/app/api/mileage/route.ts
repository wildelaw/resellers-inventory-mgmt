import { NextRequest, NextResponse } from "next/server";
import { and, desc, asc, eq, gte, lte, sql } from "drizzle-orm";
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, buildPaginationResponse } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { mileage } from "@/lib/schema";
import { createMileageSchema } from "@/lib/validations";

export const GET = withAuth(async (req, _ctx, session) => {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const { page, pageSize, offset, limit } = parsePagination(sp);
  const { sortBy, sortOrder } = parseSortParams(
    sp,
    ["date", "miles", "createdAt"],
    "date"
  );

  const filters = [eq(mileage.ownerId, Number(session.user.id))];
  const startDate = sp.get("startDate");
  if (startDate) {
    const t = Math.floor(new Date(startDate).getTime() / 1000);
    if (!isNaN(t)) filters.push(gte(mileage.date, t));
  }
  const endDate = sp.get("endDate");
  if (endDate) {
    const t = Math.floor(new Date(endDate).getTime() / 1000);
    if (!isNaN(t)) filters.push(lte(mileage.date, t));
  }

  const where = and(...filters);
  const sortCol = mileage[sortBy as keyof typeof mileage] ?? mileage.date;
  const orderBy = sortOrder === "asc" ? asc : desc;

  const list = await db
    .select()
    .from(mileage)
    .where(where)
    .orderBy(orderBy(sortCol as never))
    .limit(limit)
    .offset(offset);

  const totalRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(mileage)
    .where(where);
  const total = totalRow[0]?.count ?? 0;

  return NextResponse.json({
    items: list,
    pagination: buildPaginationResponse(total, page, pageSize),
  });
});

export const POST = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const data = createMileageSchema.parse(body);

  const now = Math.floor(Date.now() / 1000);
  const inserted = await db
    .insert(mileage)
    .values({
      date: data.date,
      miles: data.miles,
      fromLocation: data.fromLocation ?? null,
      toLocation: data.toLocation ?? null,
      address: data.address ?? null,
      vehicle: data.vehicle ?? null,
      purpose: data.purpose ?? null,
      ownerId: Number(session.user.id),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
});
