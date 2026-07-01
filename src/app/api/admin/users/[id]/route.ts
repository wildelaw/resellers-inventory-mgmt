import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users, items, sales, mileage } from '@/lib/schema';
import { updateUserSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { eq, inArray } from 'drizzle-orm';
import { nowTimestamp } from '@/lib/utils';
import type { Session } from 'next-auth';

export const GET = withAuth(async (_req: NextRequest, ctx, _session: Session) => {
  const { id } = await ctx.params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) throw ApiErrors.BadRequest('Invalid user ID');

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw ApiErrors.NotFound('User');

  const [itemCount, saleCount, mileageCount] = await Promise.all([
    db.select().from(items).where(eq(items.ownerId, userId)).all().length,
    db.select().from(sales).where(eq(sales.soldBy, userId)).all().length,
    db.select().from(mileage).where(eq(mileage.ownerId, userId)).all().length,
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      canViewAll: user.canViewAll === 1,
      isActive: user.isActive === 1,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    },
    stats: { items: itemCount, sales: saleCount, mileage: mileageCount },
  });
}, { requireAdmin: true });

export const PUT = withAuth(async (req: NextRequest, ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) throw ApiErrors.BadRequest('Invalid user ID');

  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) throw ApiErrors.NotFound('User');

  const body = await req.json();
  const validation = updateUserSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 },
    );
  }

  const data = validation.data;
  const currentUserId = parseInt(session.user.id, 10);

  // Admin cannot deactivate or change role of own account
  if (userId === currentUserId) {
    if (data.isActive === false) throw ApiErrors.BadRequest('Cannot deactivate your own account');
    if (data.role !== undefined && data.role !== target.role) {
      throw ApiErrors.BadRequest('Cannot change your own role');
    }
  }

  const update: Record<string, unknown> = { updatedAt: nowTimestamp() };
  if (data.email !== undefined) update.email = data.email.toLowerCase().trim();
  if (data.name !== undefined) update.name = data.name;
  if (data.role !== undefined) update.role = data.role;
  if (data.canViewAll !== undefined) update.canViewAll = data.canViewAll ? 1 : 0;
  if (data.isActive !== undefined) update.isActive = data.isActive ? 1 : 0;

  const updated = await db.update(users).set(update).where(eq(users.id, userId)).returning();
  return NextResponse.json({
    id: updated[0].id,
    email: updated[0].email,
    name: updated[0].name,
    role: updated[0].role,
    canViewAll: updated[0].canViewAll === 1,
    isActive: updated[0].isActive === 1,
  });
}, { requireAdmin: true });

export const DELETE = withAuth(async (req: NextRequest, ctx, _session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) throw ApiErrors.BadRequest('Invalid user ID');

  const { searchParams } = new URL(req.url);
  const transferDataTo = searchParams.get('transferDataTo');
  const transferId = transferDataTo ? parseInt(transferDataTo, 10) : null;

  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) throw ApiErrors.NotFound('User');

  if (transferId) {
    const transferTarget = await db.query.users.findFirst({ where: eq(users.id, transferId) });
    if (!transferTarget) throw ApiErrors.NotFound('Transfer target user');
    // Transfer ownership
    await db.update(items).set({ ownerId: transferId }).where(eq(items.ownerId, userId));
    await db.update(sales).set({ soldBy: transferId }).where(eq(sales.soldBy, userId));
    await db.update(mileage).set({ ownerId: transferId }).where(eq(mileage.ownerId, userId));
  } else {
    // Delete user's data
    await db.delete(mileage).where(eq(mileage.ownerId, userId));
    await db.delete(sales).where(eq(sales.soldBy, userId));
    const userItems = await db.select({ id: items.id }).from(items).where(eq(items.ownerId, userId));
    if (userItems.length > 0) {
      const itemIds = userItems.map((i) => i.id);
      const { photos } = await import('@/lib/schema');
      await db.delete(photos).where(inArray(photos.itemId, itemIds));
      await db.delete(sales).where(inArray(sales.itemId, itemIds));
      await db.delete(items).where(eq(items.ownerId, userId));
    }
  }

  await db.delete(users).where(eq(users.id, userId));
  return NextResponse.json({ success: true });
}, { requireAdmin: true });