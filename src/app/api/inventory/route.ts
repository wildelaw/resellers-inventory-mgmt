import { NextResponse, type NextRequest } from "next/server";
import { and, desc, asc, eq, gte, lte, like, or, sql, inArray } from "drizzle-orm";
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, escapeLike, buildPaginationResponse } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { items, sales, photos } from "@/lib/schema";
import { createItemSchema } from "@/lib/validations";
import { canViewAllData } from "@/lib/auth-utils";

export const GET = withAuth(async (req, _ctx, session) => {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const { page, pageSize, offset, limit } = parsePagination(sp);
  const { sortBy, sortOrder } = parseSortParams(
    sp,
    ["createdAt", "updatedAt", "purchaseDate", "purchasePrice", "name"],
    "createdAt"
  );

  const filters = [] as ReturnType<typeof eq>[];
  if (!canViewAllData(session)) {
    filters.push(eq(items.ownerId, Number(session.user.id)));
  } else {
    const ownerId = sp.get("ownerId");
    if (ownerId) filters.push(eq(items.ownerId, Number(ownerId)));
  }
  const status = sp.get("status");
  if (status) filters.push(eq(items.status, status as never));
  const category = sp.get("category");
  if (category) filters.push(eq(items.category, category));
  const startDate = sp.get("startDate");
  if (startDate) {
    const t = Math.floor(new Date(startDate).getTime() / 1000);
    if (!isNaN(t)) filters.push(gte(items.purchaseDate, t));
  }
  const endDate = sp.get("endDate");
  if (endDate) {
    const t = Math.floor(new Date(endDate).getTime() / 1000);
    if (!isNaN(t)) filters.push(lte(items.purchaseDate, t));
  }
  const search = sp.get("search");
  if (search) {
    const term = `%${escapeLike(search)}%`;
    filters.push(
      or(
        like(items.name, term),
        like(items.description, term),
        like(items.purchaseLocation, term)
      )!
    );
  }

  const where = filters.length ? and(...filters) : undefined;

  const sortCol = items[sortBy as keyof typeof items] ?? items.createdAt;
  const orderBy = sortOrder === "asc" ? asc : desc;

  const list = await db
    .select()
    .from(items)
    .where(where)
    .orderBy(orderBy(sortCol as never))
    .limit(limit)
    .offset(offset);

  const ids = list.map((i) => i.id);
  const allPhotos = ids.length
    ? await db.select().from(photos).where(inArray(photos.itemId, ids))
    : [];
  const allSales = ids.length
    ? await db.select().from(sales).where(inArray(sales.itemId, ids))
    : [];

  const itemsWithRelations = list.map((it) => ({
    ...it,
    photos: allPhotos.filter((p) => p.itemId === it.id),
    sales: allSales.filter((s) => s.itemId === it.id),
  }));

  const totalRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(items)
    .where(where);

  const total = totalRow[0]?.count ?? 0;

  const catRows = await db
    .selectDistinct({ category: items.category })
    .from(items)
    .where(eq(items.ownerId, Number(session.user.id)));
  const categories = catRows
    .map((r) => r.category)
    .filter((c): c is string => Boolean(c));

  return NextResponse.json({
    items: itemsWithRelations,
    pagination: buildPaginationResponse(total, page, pageSize),
    categories: Array.from(new Set(categories)).sort(),
  });
});

export const POST = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const data = createItemSchema.parse(body);

  const inserted = await db
    .insert(items)
    .values({
      name: data.name,
      description: data.description ?? null,
      purchaseDate: data.purchaseDate,
      purchasePrice: data.purchasePrice,
      purchaseLocation: data.purchaseLocation ?? null,
      category: data.category ?? null,
      status: "available",
      notes: data.notes ?? null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      ownerId: Number(session.user.id),
    })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
});
