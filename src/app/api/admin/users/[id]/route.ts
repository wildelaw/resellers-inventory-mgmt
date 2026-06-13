import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users, items, sales, mileage, photos } from '@/lib/schema';
import { updateUserSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { eq, sql } from 'drizzle-orm';

export const GET = withAuth(async (_req, ctx, _session) => {
  const { id } = await ctx.params;
  const user = await db.select({
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
  }).from(users).where(eq(users.id, Number(id))).get();

  if (!user) {
    throw ApiErrors.NotFound('User');
  }

  // Fetch user stats
  const [itemCount, saleCount, mileageCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(items).where(eq(items.ownerId, Number(id))).get(),
    db.select({ count: sql<number>`count(*)` }).from(sales).where(eq(sales.soldBy, Number(id))).get(),
    db.select({ count: sql<number>`count(*)` }).from(mileage).where(eq(mileage.ownerId, Number(id))).get(),
  ]);

  return NextResponse.json({
    ...user,
    stats: {
      items: itemCount?.count ?? 0,
      sales: saleCount?.count ?? 0,
      mileage: mileageCount?.count ?? 0,
    },
  });
}, { requireAdmin: true });

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const userId = Number(id);

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    throw ApiErrors.NotFound('User');
  }

  const body = await req.json();
  const parsed = updateUserSchema.parse(body);

  // Cannot deactivate or change role of own account
  if (userId === Number(session.user.id)) {
    if (parsed.isActive === false) {
      throw ApiErrors.BadRequest('Cannot deactivate your own account');
    }
    if (parsed.role && parsed.role !== 'admin') {
      throw ApiErrors.BadRequest('Cannot change your own role');
    }
  }

  const updateData: Record<string, unknown> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };

  if (parsed.name !== undefined) updateData.name = parsed.name;
  if (parsed.email !== undefined) updateData.email = parsed.email;
  if (parsed.role !== undefined) updateData.role = parsed.role;
  if (parsed.canViewAll !== undefined) updateData.canViewAll = parsed.canViewAll ? 1 : 0;
  if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive ? 1 : 0;

  const result = await db.update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning().get();

  // Don't return password hash
  const { passwordHash: _, ...userWithoutPassword } = result;

  return NextResponse.json(userWithoutPassword);
}, { requireAdmin: true });

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const userId = Number(id);

  if (userId === Number(session.user.id)) {
    throw ApiErrors.BadRequest('Cannot delete your own account');
  }

  const { searchParams } = new URL(req.url);
  const transferDataTo = searchParams.get('transferDataTo');

  if (transferDataTo) {
    const targetUserId = Number(transferDataTo);
    const targetUser = await db.select().from(users).where(eq(users.id, targetUserId)).get();
    if (!targetUser) {
      throw ApiErrors.BadRequest('Transfer target user not found');
    }

    // Transfer data ownership
    await db.update(items).set({ ownerId: targetUserId }).where(eq(items.ownerId, userId)).run();
    await db.update(sales).set({ soldBy: targetUserId }).where(eq(sales.soldBy, userId)).run();
    await db.update(mileage).set({ ownerId: targetUserId }).where(eq(mileage.ownerId, userId)).run();
  } else {
    // Delete user's data if no transfer
    const userItems = await db.select({ id: items.id }).from(items).where(eq(items.ownerId, userId)).all();
    for (const item of userItems) {
      await db.delete(photos).where(eq(photos.itemId, item.id)).run();
      await db.delete(sales).where(eq(sales.itemId, item.id)).run();
    }
    await db.delete(items).where(eq(items.ownerId, userId)).run();
    await db.delete(sales).where(eq(sales.soldBy, userId)).run();
    await db.delete(mileage).where(eq(mileage.ownerId, userId)).run();
  }

  await db.delete(users).where(eq(users.id, userId)).run();

  return NextResponse.json({ success: true });
}, { requireAdmin: true });