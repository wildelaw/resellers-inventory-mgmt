import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { withAuth, validateOriginOrReferer } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { users, items, sales, mileage } from "@/lib/schema";
import { updateUserSchema } from "@/lib/validations";
import { ApiErrors } from "@/lib/api-errors";

export const GET = withAuth(
  async (_req, ctx) => {
    const { id } = await ctx.params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) throw ApiErrors.BadRequest("Invalid id");

    const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!u) throw ApiErrors.NotFound("User");

    const itemCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .where(eq(items.ownerId, userId));
    const saleCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(sales)
      .where(eq(sales.soldBy, userId));
    const mileageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(mileage)
      .where(eq(mileage.ownerId, userId));

    return NextResponse.json({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      canViewAll: u.canViewAll,
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      stats: {
        items: Number(itemCount[0]?.count ?? 0),
        sales: Number(saleCount[0]?.count ?? 0),
        mileage: Number(mileageCount[0]?.count ?? 0),
      },
    });
  },
  { requireAdmin: true }
);

export const PUT = withAuth(
  async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await ctx.params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) throw ApiErrors.BadRequest("Invalid id");

    const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!u) throw ApiErrors.NotFound("User");

    const body = await req.json();
    const data = updateUserSchema.parse(body);

    const isSelf = userId === Number(session.user.id);
    if (isSelf) {
      if (data.isActive === false) {
        throw ApiErrors.BadRequest("Cannot deactivate your own account");
      }
      if (data.role && data.role !== u.role) {
        throw ApiErrors.BadRequest("Cannot change your own role");
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const updates: Record<string, unknown> = { updatedAt: now };
    if (data.email !== undefined) updates.email = data.email.toLowerCase().trim();
    if (data.name !== undefined) updates.name = data.name;
    if (data.role !== undefined) updates.role = data.role;
    if (data.canViewAll !== undefined) updates.canViewAll = data.canViewAll;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    await db.update(users).set(updates as never).where(eq(users.id, userId));
    return NextResponse.json({ success: true });
  },
  { requireAdmin: true }
);

export const DELETE = withAuth(
  async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await ctx.params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) throw ApiErrors.BadRequest("Invalid id");
    if (userId === Number(session.user.id)) {
      throw ApiErrors.BadRequest("Cannot delete your own account");
    }

    const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!u) throw ApiErrors.NotFound("User");

    const url = new URL(req.url);
    const transferToRaw = url.searchParams.get("transferDataTo");
    const transferTo = transferToRaw ? Number(transferToRaw) : null;
    if (transferTo) {
      const target = await db.query.users.findFirst({
        where: eq(users.id, transferTo),
      });
      if (!target) throw ApiErrors.NotFound("Transfer target user");
    }

    if (transferTo) {
      await db.update(items).set({ ownerId: transferTo }).where(eq(items.ownerId, userId));
      await db.update(sales).set({ soldBy: transferTo }).where(eq(sales.soldBy, userId));
      await db.update(mileage).set({ ownerId: transferTo }).where(eq(mileage.ownerId, userId));
    } else {
      await db.delete(items).where(eq(items.ownerId, userId));
      await db.delete(sales).where(eq(sales.soldBy, userId));
      await db.delete(mileage).where(eq(mileage.ownerId, userId));
    }
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  },
  { requireAdmin: true }
);
