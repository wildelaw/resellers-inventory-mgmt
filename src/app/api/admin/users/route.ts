import { NextResponse, type NextRequest } from "next/server";
import { and, desc, asc, eq, like, or, sql } from "drizzle-orm";
import { withAuth, parsePagination, parseSortParams, escapeLike, buildPaginationResponse, validateOriginOrReferer } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { createUserSchema } from "@/lib/validations";
import bcrypt from "bcrypt";
import { ApiErrors } from "@/lib/api-errors";

export const GET = withAuth(
  async (req) => {
    const url = new URL(req.url);
    const sp = url.searchParams;
    const { page, pageSize, offset, limit } = parsePagination(sp);
    const { sortBy, sortOrder } = parseSortParams(
      sp,
      ["email", "name", "role", "createdAt"],
      "createdAt"
    );

    const filters = [] as ReturnType<typeof eq>[];
    const role = sp.get("role");
    if (role) filters.push(eq(users.role, role as never));
    const isActive = sp.get("isActive");
    if (isActive !== null) {
      filters.push(eq(users.isActive, isActive === "true"));
    }
    const search = sp.get("search");
    if (search) {
      const term = `%${escapeLike(search)}%`;
      filters.push(
        or(like(users.email, term), like(users.name, term))!
      );
    }

    const where = filters.length ? and(...filters) : undefined;
    const sortCol = users[sortBy as keyof typeof users] ?? users.createdAt;
    const orderBy = sortOrder === "asc" ? asc : desc;

    const list = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        canViewAll: users.canViewAll,
        isActive: users.isActive,
        passwordChangedAt: users.passwordChangedAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLogin: users.lastLogin,
      })
      .from(users)
      .where(where)
      .orderBy(orderBy(sortCol as never))
      .limit(limit)
      .offset(offset);

    const totalRow = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(where);
    const total = totalRow[0]?.count ?? 0;

    return NextResponse.json({
      items: list,
      pagination: buildPaginationResponse(total, page, pageSize),
    });
  },
  { requireAdmin: true }
);

export const POST = withAuth(
  async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const data = createUserSchema.parse(body);

    const existing = await db.query.users.findFirst({
      where: eq(users.email, data.email.toLowerCase().trim()),
    });
    if (existing) throw ApiErrors.Conflict("Email already in use");

    const passwordHash = await bcrypt.hash(data.password, 10);
    const now = Math.floor(Date.now() / 1000);

    const inserted = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase().trim(),
        name: data.name,
        passwordHash,
        role: data.role,
        canViewAll: data.canViewAll ?? false,
        isActive: true,
        passwordChangedAt: now,
        createdAt: now,
        updatedAt: now,
        createdBy: Number(session.user.id),
      })
      .returning();

    const u = inserted[0];
    return NextResponse.json(
      {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        canViewAll: u.canViewAll,
        isActive: u.isActive,
      },
      { status: 201 }
    );
  },
  { requireAdmin: true }
);
